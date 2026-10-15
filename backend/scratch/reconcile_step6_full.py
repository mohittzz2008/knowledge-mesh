import httpx
import re
from html import unescape
from collections import Counter

url = "https://www.codechef.com/users/tourist"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
resp = httpx.get(url, headers=headers, follow_redirects=True, timeout=15.0)
html = resp.text

print("==================================================")
print("1. TRACE SOURCE OF total_solved")
print("==================================================")
# Find 'Total Problems Solved'
h3_match = re.search(r'<h3>Total Problems Solved:\s*(\d+)</h3>', html, re.IGNORECASE)
if h3_match:
    print(f"Found H3 tag: '{h3_match.group(0)}'")
    print(f"Extracted total_solved integer: {h3_match.group(1)}")
else:
    print("H3 tag not found using exact regex!")

print("\n==================================================")
print("2. TRACE STRUCTURES IN section.problems-solved")
print("==================================================")
sec_match = re.search(r'<section\s+class="[^"]*problems-solved[^"]*"[^>]*>(.*?)</section>', html, re.DOTALL | re.IGNORECASE)
if not sec_match:
    print("CRITICAL: section.problems-solved NOT FOUND!")
    exit(1)

sec_html = sec_match.group(1)

# Check all h5 headers (contests vs practice)
h5s = re.findall(r'<h5>(.*?)</h5>', sec_html, re.DOTALL)
print(f"Total H5 contest/section headers in section: {len(h5s)}")

practice_h5s = [h for h in h5s if 'practice' in h.lower()]
contest_h5s = [h for h in h5s if 'practice' not in h.lower()]
print(f"  - Contest H5 headers: {len(contest_h5s)}")
print(f"  - Practice H5 headers: {len(practice_h5s)}")

# Inspect problem span items: <span style="font-size: 12px">
raw_spans = re.findall(r'<span\s+style=["\']font-size:\s*12px;?["\']\s*;?>\s*(.*?)\s*</span>', sec_html, re.IGNORECASE)
print(f"\nTotal raw <span style=\"font-size: 12px\"> items: {len(raw_spans)}")

# Let's clean titles
cleaned_titles = []
for s in raw_spans:
    t = unescape(re.sub(r'<[^>]+>', '', s)).replace('\xa0', ' ').replace('&nbsp;', ' ').strip()
    if t:
        cleaned_titles.append(t)

print(f"Total cleaned titles from spans: {len(cleaned_titles)}")

# Let's check for any other HTML structures inside section.problems-solved
# Check for <a> tags, <article> tags, <li> tags, <p> tags, etc.
other_tags = set(re.findall(r'<([a-zA-Z0-9]+)', sec_html))
print(f"\nHTML tag types inside section.problems-solved: {sorted(list(other_tags))}")

# Check if there are any <a> tags inside section.problems-solved
a_tags = re.findall(r'<a\s+[^>]*>(.*?)</a>', sec_html, re.DOTALL)
print(f"Total <a> tags inside section.problems-solved: {len(a_tags)}")

print("\n==================================================")
print("3. CHECK DUPLICATES & EXTRACTION COUNT")
print("==================================================")
# Apply connector logic to cleaned_titles
seen_ids = set()
extracted_entries = []
all_codes = []

for title in cleaned_titles:
    code = re.sub(r'[^A-Za-z0-9_]+', '', title.upper()) or "PROBLEM"
    all_codes.append(code)
    lower_id = title.lower()
    if lower_id not in seen_ids:
        seen_ids.add(lower_id)
        extracted_entries.append({
            "problem_title": title,
            "problem_code": code
        })

print(f"extracted_entries (connector output count): {len(extracted_entries)}")
print(f"unique_problem_codes (unique codes): {len(set(all_codes))}")

# Count duplicates
counts = Counter(all_codes)
duplicates = {code: count for code, count in counts.items() if count > 1}
print(f"duplicates count: {len(duplicates)}")
for code, count in duplicates.items():
    titles_for_code = [t for t in cleaned_titles if (re.sub(r'[^A-Za-z0-9_]+', '', t.upper()) or "PROBLEM") == code]
    print(f"  - Duplicate Code: '{code}' (Count: {count}), Titles: {set(titles_for_code)}")

print("\n==================================================")
print("4. RECONCILIATION SUMMARY")
print("==================================================")
header_solved = int(h3_match.group(1)) if h3_match else 0
raw_html_spans = len(cleaned_titles)
unique_extracted = len(extracted_entries)
discrepancy_header_vs_raw = header_solved - raw_html_spans
discrepancy_header_vs_unique = header_solved - unique_extracted

print(f"CodeChef Header total_solved: {header_solved}")
print(f"Total Raw Problem Spans in HTML: {raw_html_spans}")
print(f"Unique Extracted Problems: {unique_extracted}")
print(f"Duplicate problem spans in HTML: {raw_html_spans - unique_extracted}")
print(f"Missing problem spans from HTML (header - raw): {discrepancy_header_vs_raw}")
print(f"Total discrepancy (header - unique): {discrepancy_header_vs_unique}")

print("\n==================================================")
print("5. CHECK PRACTICE VS CONTEST SECTIONS IN DETAIL")
print("==================================================")
# Check if practice problems appear in a separate div/article or section
# Let's inspect all <article> or <h5> headings and their contents
articles = re.findall(r'<article>(.*?)</article>', sec_html, re.DOTALL)
print(f"Total <article> tags inside problems-solved section: {len(articles)}")
for idx, art in enumerate(articles):
    h5 = re.search(r'<h5>(.*?)</h5>', art, re.DOTALL)
    h5_text = unescape(re.sub(r'<[^>]+>', '', h5.group(1))).strip() if h5 else f"Article {idx}"
    art_spans = re.findall(r'<span\s+style=["\']font-size:\s*12px;?["\']\s*;?>\s*(.*?)\s*</span>', art, re.IGNORECASE)
    print(f"  [{idx+1}] {h5_text}: {len(art_spans)} problem spans")
