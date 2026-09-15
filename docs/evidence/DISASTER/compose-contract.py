"""Use CORE's canonical fragment composer in a temporary directory, without editing generated files."""
from pathlib import Path
import importlib.util, json, sys, tempfile
root=Path(__file__).resolve().parents[3]
loader=importlib.util.spec_from_file_location('core_fragment_composer',root/'docs/01_requirements/04_api/tools/contract_fragments.py')
module=importlib.util.module_from_spec(loader);loader.loader.exec_module(module)
spec=json.loads((root/'docs/01_requirements/04_api/openapi.json').read_text())
with tempfile.TemporaryDirectory(prefix='disaster-contract-') as directory:
    scratch=Path(directory);(scratch/'fragments').mkdir();(scratch/'endpoints').mkdir()
    for name in ['PLACES','PLUGINS','DISASTER']:
        path=root/f'docs/01_requirements/04_api/fragments/{name}.json'
        fragment=json.loads(path.read_text())
        for operation in fragment.get('operations',[]):
            route,method=operation['path'],operation['method'].lower()
            if spec['paths'].get(route,{}).get(method,{}).get('operationId')==operation['operationId']:
                del spec['paths'][route][method]
        (scratch/f'fragments/{name}.json').symlink_to(path)
    for methods in spec['paths'].values():
        for entry in methods.values():
            parameters=[]
            for parameter in entry['parameters']:
                if '$ref' in parameter:
                    target=spec
                    for segment in parameter['$ref'][2:].split('/'):
                        target=target[segment.replace('~1','/').replace('~0','~')]
                    parameter=target
                parameters.append(parameter)
            entry['parameters']=parameters
    Path(sys.argv[1]).write_text(json.dumps(module.merge_fragments(spec,scratch),ensure_ascii=False))
