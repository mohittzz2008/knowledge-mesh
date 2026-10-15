import asyncio
import sys
from app.services.platform.codechef import CodeChefConnector

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    connector = CodeChefConnector()
    print("=== FETCH EVIDENCE FOR tourist ===")
    evidence = await connector.fetch_evidence("tourist")
    print(f"Total evidence items for tourist: {len(evidence)}")
    for idx, item in enumerate(evidence[:6]):
        norm = connector.normalize_evidence(item)
        print(f"  Item {idx+1}: type={item.get('type')}, title={norm.get('title')}, source_url={norm.get('source_url')}")

if __name__ == "__main__":
    asyncio.run(main())
