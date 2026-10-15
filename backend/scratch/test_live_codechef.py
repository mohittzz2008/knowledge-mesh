import asyncio
import sys
from app.services.platform.codechef import CodeChefConnector

sys.stdout.reconfigure(encoding='utf-8')

async def run_live_test():
    connector = CodeChefConnector()
    
    print("=== LIVE TEST 1: VALID USER (tourist) ===")
    valid_res = await connector.validate_identity("tourist")
    print(f"validate_identity('tourist') -> {valid_res}")
    
    await asyncio.sleep(2.0)
    profile = await connector.fetch_profile("tourist")
    if profile:
        print(f"fetch_profile('tourist') total_solved -> {profile.get('total_solved')}, rating -> {profile.get('rating')}, stars -> {profile.get('stars')}")
        print(f"fetch_profile('tourist') solved_codes count -> {len(profile.get('solved_codes', []))}")
        
        await asyncio.sleep(2.0)
        evidence = await connector.fetch_evidence("tourist")
        print(f"fetch_evidence('tourist') -> {len(evidence)} total evidence items fetched!")
        for idx, item in enumerate(evidence[:6]):
            norm = connector.normalize_evidence(item)
            print(f"  Item {idx+1}: type={item.get('type')}, title={norm.get('title')}, source_url={norm.get('source_url')}")

if __name__ == "__main__":
    asyncio.run(run_live_test())
