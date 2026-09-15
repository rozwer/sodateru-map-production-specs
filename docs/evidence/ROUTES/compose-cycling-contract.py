"""Temporary integration contract via the real shared composer; never modifies generated files."""
from pathlib import Path
import importlib.util, json, sys, tempfile
root=Path(__file__).resolve().parents[3]
loader=importlib.util.spec_from_file_location('composer',root/'docs/01_requirements/04_api/tools/contract_fragments.py')
module=importlib.util.module_from_spec(loader);loader.loader.exec_module(module)
spec=json.loads((root/'docs/01_requirements/04_api/openapi.json').read_text())
fragment=json.loads((root/'docs/01_requirements/04_api/fragments/ROUTES.json').read_text())
# The input is already composed. Replace only this fragment's matching operation IDs.
for operation in fragment['operations']:
    existing=spec['paths'].get(operation['path'],{}).get(operation['method'].lower())
    if existing:
        assert existing['operationId']==operation['operationId']
        operation['replaceOperation']=True
with tempfile.TemporaryDirectory(prefix='routes-contract-') as temporary:
    scratch=Path(temporary);(scratch/'fragments').mkdir();(scratch/'endpoints').mkdir()
    (scratch/'fragments/ROUTES.json').write_text(json.dumps(fragment))
    Path(sys.argv[1]).write_text(json.dumps(module.merge_fragments(spec,scratch),ensure_ascii=False))
