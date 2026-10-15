import httpx
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async def main():
    username = "tourist"
    async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
        res = await client.get(f"https://www.codechef.com/users/{username}")
        html = res.text
        
        script_tags = re.findall(r'<script.*?>(.*?)</script>', html, re.DOTALL)
        for idx, s in enumerate(script_tags):
            if "colorForSections" in s or "all_rating" in s or "problems" in s.lower():
                print(f"=== SCRIPT {idx} (Length: {len(s)}) ===")
                print(s[:2500])
                print("\n... searching for keywords in Script ...")
                for line in s.split('\n'):
                    if any(k in line.lower() for k in ['solved', 'problems', 'status', 'array', 'codes']):
                        print("  LINE:", line[:150])

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
