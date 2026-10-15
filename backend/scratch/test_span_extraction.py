import httpx
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def test_problem_extraction(username):
    print(f"\n=================== USER: {username} ===================")
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        html = res.text
        
        match = re.search(r'<section\s+class="[^"]*problems-solved[^"]*"[^>]*>(.*?)</section>', html, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1)
            
            # Extract problem titles using font-size 12px span pattern
            problem_names = re.findall(r'<span\s+style=["\']font-size:\s*12px;?["\']\s*;?>\s*(.*?)\s*</span>', content, re.IGNORECASE)
            
            # Filter and clean up HTML entities
            clean_names = []
            for name in problem_names:
                cleaned = re.sub(r'<[^>]+>', '', name).replace('&nbsp;', ' ').strip()
                if cleaned and len(cleaned) > 1 and cleaned not in clean_names:
                    clean_names.append(cleaned)
                    
            print(f"Extracted Unique Problem Titles Count: {len(clean_names)}")
            print("First 20 extracted problem titles:", clean_names[:20])
        else:
            print("Section rating-data-section problems-solved not found!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_problem_extraction("tourist"))
    asyncio.run(test_problem_extraction("admin"))
