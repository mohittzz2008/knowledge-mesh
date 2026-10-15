import httpx
import re

url = "https://www.codechef.com/users/tourist"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
resp = httpx.get(url, headers=headers, follow_redirects=True, timeout=15.0)
html = resp.text

# Search specifically for Total Problems Solved or rating-data-section problems-solved
pos = html.find("Total Problems Solved")
print("Position of 'Total Problems Solved':", pos)

if pos != -1:
    sub = html[max(0, pos-200):pos+500]
    print("Snippet around Total Problems Solved:\n", sub)

# Find the exact section start
sec_match = re.search(r'<section[^>]*class=[\'"][^\'"]*problems-solved[^\'"]*[\'"][^>]*>(.*?)</section>', html, re.DOTALL)
if sec_match:
    sec_html = sec_match.group(1)
    print("\nSection HTML length:", len(sec_html))

    # Header H3
    h3 = re.search(r'<h3>(.*?)</h3>', sec_html, re.DOTALL)
    print("Found H3:", h3.group(1).strip() if h3 else "NONE")

    # Let's count articles or p tags or a tags
    a_tags = re.findall(r'<a[^>]*>(.*?)</a>', sec_html, re.DOTALL)
    print(f"Total <a> tags inside problems-solved section: {len(a_tags)}")

    # Sample first 5 <a> tags
    for a in a_tags[:5]:
        print("  - <a> tag:", a.strip()[:100])

    # Status links pattern:
    status_a = re.findall(r'<a[^>]+href=[\'"]([^\'"]+)[\'"][^>]*>(.*?)</a>', sec_html, re.DOTALL)
    print(f"Total <a> tags with href: {len(status_a)}")

    status_problems = []
    for href, content in status_a:
        m = re.search(r'/status/([^,\'"]+),tourist', href, re.IGNORECASE)
        if m:
            code = m.group(1)
            title = re.sub(r'<[^>]+>', '', content).strip()
            status_problems.append((code, title))
        else:
            # Let's print non-matching hrefs to see what else is in section
            pass

    print(f"\nStatus problems extracted: {len(status_problems)}")

    # Let's check all hrefs in section
    all_hrefs = [h for h, c in status_a]
    non_status = [h for h in all_hrefs if '/status/' not in h]
    print(f"Non-status hrefs count: {len(non_status)}")
    if non_status:
        print("Sample non-status hrefs:", non_status[:10])
