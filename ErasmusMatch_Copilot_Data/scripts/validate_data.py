from pathlib import Path
import csv, collections, sys
ROOT=Path(__file__).resolve().parents[1]
def read(p):
 with open(ROOT/p,encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
partners=read('data/raw/partner_universities_2026_27.csv')
catalogs=read('data/catalogs/catalog_master.csv')
errors=[]
if len(partners)!=len(catalogs):errors.append('Partner/master row counts differ')
ids=[r['id'] for r in partners]
if len(set(ids))!=len(ids):errors.append('Duplicate partner IDs')
if set(ids)!={r['partner_id'] for r in catalogs}:errors.append('Catalog partner IDs do not match partners')
for r in catalogs:
 url=r['official_catalog_url'].strip()
 if url and not url.startswith('https://'):errors.append(f"Invalid catalog URL for {r['partner_id']}: {url}")
 for key in ['winter_2026_27_verified','spring_2027_verified']:
  if r[key].lower() not in ('yes','no','unknown','') :errors.append(f"Invalid {key} value for {r['partner_id']}")
print(f'Partner rows: {len(partners)} | Distinct Erasmus codes: {len(set(r["erasmus_code"] for r in partners))}')
print(f'Catalog URLs present (NOT necessarily verified): {sum(bool(r["official_catalog_url"].strip()) for r in catalogs)}')
print(f'Winter course catalogs marked verified: {sum(r["winter_2026_27_verified"].lower()=="yes" for r in catalogs)}')
print(f'Spring course catalogs marked verified: {sum(r["spring_2027_verified"].lower()=="yes" for r in catalogs)}')
if errors:
 print('ERRORS:',*errors,sep='\n- ');sys.exit(1)
print('PASS: structure checks only; does not verify live web sources.')
