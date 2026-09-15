"""Exercise the supplied CORE fragment composer without editing shared generated files."""
from pathlib import Path
import importlib.util, json, sys, tempfile
root=Path(__file__).resolve().parents[3]
loader=importlib.util.spec_from_file_location('core_fragment_composer',root/'docs/01_requirements/04_api/tools/contract_fragments.py')
module=importlib.util.module_from_spec(loader);loader.loader.exec_module(module)
with tempfile.TemporaryDirectory(prefix='plugins-contract-') as temporary:
    scratch=Path(temporary);(scratch/'fragments').mkdir();(scratch/'endpoints').mkdir()
    (scratch/'fragments/PLUGINS.json').symlink_to(root/'docs/01_requirements/04_api/fragments/PLUGINS.json')
    spec=json.loads((root/'docs/01_requirements/04_api/openapi.json').read_text())
    # The composer accepts pre-emission inline parameters; emitted OpenAPI uses component refs.
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
