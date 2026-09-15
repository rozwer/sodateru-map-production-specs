"""Compose the supplied feature contracts using CORE's official merger into a test directory."""
from pathlib import Path
import copy, importlib.util, json, sys, tempfile
root=Path(__file__).resolve().parents[3]
loader=importlib.util.spec_from_file_location('core_fragment_composer',root/'docs/01_requirements/04_api/tools/contract_fragments.py')
module=importlib.util.module_from_spec(loader);loader.loader.exec_module(module)
spec=json.loads((root/'docs/01_requirements/04_api/openapi.json').read_text())
def inline(parameters):
    result=[]
    for parameter in parameters:
        if '$ref' in parameter:
            target=spec
            for segment in parameter['$ref'][2:].split('/'):
                target=target[segment.replace('~1','/').replace('~0','~')]
            parameter=copy.deepcopy(target)
        result.append(parameter)
    return result
for methods in spec['paths'].values():
    for entry in methods.values(): entry['parameters']=inline(entry.get('parameters',[]))
with tempfile.TemporaryDirectory(prefix='map-custom-contract-') as temporary:
    scratch=Path(temporary);(scratch/'fragments').mkdir();(scratch/'endpoints').mkdir()
    for name in ['MAP-CUSTOM','PLUGINS','AI','SETTINGS']:
        fragment=json.loads((root/f'docs/01_requirements/04_api/fragments/{name}.json').read_text())
        for entry in fragment['operations']: entry['parameters']=inline(entry.get('parameters',[]))
        (scratch/f'fragments/{name}.json').write_text(json.dumps(fragment))
    Path(sys.argv[1]).write_text(json.dumps(module.merge_fragments(spec,scratch),ensure_ascii=False))
