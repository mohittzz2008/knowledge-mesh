import httpx
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def print_section_content(username):
    print(f"\n=================== USER: {username} ===================")
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        html = res.text
        
        match = re.search(r'<section\s+class="[^"]*problems-solved[^"]*"[^>]*>(.*?)</section>', html, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1)
            print("SNIPPET (first 1500 chars):\n", content[:1500])
            print("\nSearching for <a> tags inside section...")
            anchors = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', content, re.DOTALL)
            print(f"Total <a> tags found in section: {len(anchors)}")
            for a in anchors[:15]:
                print("  Anchor:", a)

if __name__ == "__main__":
    import asyncio
    asyncio.run(print_section_content("tourist"))
    asyncio.run(print_section_content("admin"))
