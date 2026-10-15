import httpx
import re
from html import unescape
from collections import Counter

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def main():
    username = "tourist"
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        if res.status_code != 200:
            print("Failed to fetch HTML, status:", res.status_code)
            return

        html = res.text
        print("Fetched HTML length:", len(html))

        # 1. TRACE SOURCE OF total_solved = 632
        header_matches = re.findall(r'Total Problems Solved:\s*(\d+)', html, re.IGNORECASE)
        print("\n=== 1. SOURCE OF total_solved ===")
        print("Header match count:", len(header_matches))
        for h in header_matches:
            print("  Found header count:", h)

        # Also search for all <h3> or <h5> headings inside problems-solved
        match = re.search(r'<section\s+class="[^"]*problems-solved[^"]*"[^>]*>(.*?)</section>', html, re.DOTALL | re.IGNORECASE)
        if not match:
            print("Section problems-solved not found")
            return
            
        section_html = match.group(1)
        headings = re.findall(r'<h[35][^>]*>(.*?)</h[35]>', section_html, re.DOTALL | re.IGNORECASE)
        print("\n=== 2. HEADINGS & CATEGORIES IN SECTION ===")
        for h in headings:
            cleaned_h = unescape(re.sub(r'<[^>]+>', '', h)).strip()
            print("  Heading:", cleaned_h)

        # 3. COUNT PROBLEMS BY SUB-SECTION / CONTEST
        # CodeChef profile lists contests inside div.content
        contest_blocks = re.findall(r'<div\s+class=["\']content["\'][^>]*>(.*?)</div>', section_html, re.DOTALL | re.IGNORECASE)
        print(f"\n=== 3. CONTEST / PATH BLOCKS ({len(contest_blocks)} total) ===")
        
        all_raw_spans = []
        block_problem_counts = []

        for idx, block in enumerate(contest_blocks):
            # Extract contest name if present
            c_name_match = re.search(r'<h5[^>]*>(.*?)</h5>', block, re.DOTALL | re.IGNORECASE)
            c_name = unescape(re.sub(r'<[^>]+>', '', c_name_match.group(1))).strip() if c_name_match else f"Block #{idx+1}"
            
            # Extract problem titles from font-size 12px spans
            spans = re.findall(r'<span\s+style=["\']font-size:\s*12px;?["\']\s*;?>\s*(.*?)\s*</span>', block, re.IGNORECASE)
            clean_spans = [unescape(re.sub(r'<[^>]+>', '', s)).replace('\xa0', ' ').replace('&nbsp;', ' ').strip() for s in spans if s.strip()]
            
            all_raw_spans.extend(clean_spans)
            block_problem_counts.append((c_name, len(clean_spans)))

        print(f"Total raw span occurrences across all blocks: {len(all_raw_spans)}")
        
        # 4. CHECK FOR DUPLICATES
        span_counts = Counter(all_raw_spans)
        duplicates = {k: v for k, v in span_counts.items() if v > 1}
        
        print("\n=== 4. DUPLICATE ANALYSIS ===")
        print(f"Total raw spans: {len(all_raw_spans)}")
        print(f"Unique span titles: {len(span_counts)}")
        print(f"Duplicate titles count: {len(duplicates)}")

        if duplicates:
            print("\nSample Duplicate Problem Titles (solved in multiple contests/practice):")
            for title, cnt in list(duplicates.items())[:15]:
                print(f"  - '{title}': solved {cnt} times")

        # 5. CHECK SLUG / CODE MAPPING COLLISIONS
        slugs = []
        slug_to_titles = {}
        for title in span_counts.keys():
            slug = re.sub(r'[^A-Za-z0-9_]+', '', title.upper()) or "PROBLEM"
            slugs.append(slug)
            slug_to_titles.setdefault(slug, []).append(title)

        slug_counts = Counter(slugs)
        slug_collisions = {k: v for k, v in slug_counts.items() if v > 1}
        print(f"\nUnique slug codes: {len(slug_counts)}")
        print(f"Slug collision count: {len(slug_collisions)}")
        if slug_collisions:
            print("\nSample Slug Collisions:")
            for slug, cnt in list(slug_collisions.items())[:10]:
                print(f"  Slug '{slug}' -> Titles: {slug_to_titles[slug]}")

        # 6. MATHEMATICAL RECONCILIATION SUMMARY
        print("\n=== 6. MATHEMATICAL RECONCILIATION SUMMARY ===")
        print(f"Displayed 'Total Problems Solved': {header_matches[0] if header_matches else 'N/A'}")
        print(f"Total raw problem occurrences in profile HTML: {len(all_raw_spans)}")
        print(f"Unique problem titles in profile HTML: {len(span_counts)}")
        print(f"Unique slugified problem codes: {len(slug_counts)}")
        print(f"Difference (Raw Spans - Unique Titles): {len(all_raw_spans) - len(span_counts)}")
        print(f"Difference (Displayed 632 - Raw Spans 632): {int(header_matches[0]) - len(all_raw_spans) if header_matches else 'N/A'}")
        print(f"Difference (Displayed 632 - Unique Codes): {int(header_matches[0]) - len(slug_counts) if header_matches else 'N/A'}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
