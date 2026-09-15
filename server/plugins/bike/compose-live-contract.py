"""Temporary test contract using the shared composer; generated production files are untouched."""
import copy,json,pathlib,shutil,sys
root=pathlib.Path(__file__).resolve().parents[3]
source=root/'docs/01_requirements/04_api'
target=root/'.local/bike-e2e-contract'
(target/'fragments').mkdir(parents=True,exist_ok=True)
(target/'endpoints').mkdir(exist_ok=True)
for name in ['BIKE','PLUGINS','ROUTES','PLACES']:
    shutil.copyfile(source/'fragments'/f'{name}.json',target/'fragments'/f'{name}.json')
spec=json.loads((source/'openapi.json').read_text())
# The published catalog compacts parameters to local references. The composer takes expanded parameters.
for methods in spec['paths'].values():
    for operation in methods.values():
        operation['parameters']=[copy.deepcopy(spec['components']['parameters'][p['$ref'].split('/')[-1]]) if '$ref' in p else p for p in operation['parameters']]
sys.path.insert(0,str(source/'tools'))
from contract_fragments import merge_fragments
spec=merge_fragments(spec,target)
(target/'openapi.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
print(target/'openapi.json')
