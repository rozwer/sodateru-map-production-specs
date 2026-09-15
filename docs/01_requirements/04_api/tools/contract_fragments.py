"""Compose owned operation/schema fragments into the shared OpenAPI catalog."""
import copy
import json


def merge_fragments(spec, root, http_components=None):
    http_components = copy.deepcopy(http_components or spec['components'])
    http_components.setdefault('parameters', {}).setdefault('header_X-Data-Mode', {
        'name': 'X-Data-Mode', 'in': 'header', 'required': True,
        'schema': {'type': 'string', 'enum': ['live', 'demo']},
    })
    def resolve_http(value):
        if isinstance(value, list):
            return [resolve_http(item) for item in value]
        if isinstance(value, dict):
            reference = value.get('$ref', '')
            if reference.startswith(('#/components/parameters/', '#/components/responses/')):
                _, _, collection, name = reference.split('/')
                target = http_components.get(collection, {}).get(name)
                if target is None:
                    raise ValueError(f'Unresolved HTTP reference: {reference}')
                return resolve_http({**target, **{key: child for key, child in value.items() if key != '$ref'}})
            return {key: resolve_http(child) for key, child in value.items()}
        return value
    spec['paths'] = resolve_http(spec['paths'])
    sources = []
    operations = []
    header_templates = {p['name'].lower(): copy.deepcopy(p)
                        for methods in spec['paths'].values() for entry in methods.values()
                        for p in entry['parameters'] if p.get('in') == 'header'}
    for path in sorted((root / 'fragments').glob('*.json')):
        fragment = json.loads(path.read_text())
        if not fragment.get('taskId') or not fragment.get('version'):
            raise ValueError(f'{path.name}: taskId and version are required')
        sources.append({'file': f'fragments/{path.name}', 'taskId': fragment['taskId'], 'version': fragment['version']})
        for name, schema in fragment.get('schemas', {}).items():
            previous = spec['components']['schemas'].get(name)
            if previous is not None and previous != schema and name not in fragment.get('replaceSchemas', []):
                raise ValueError(f'{path.name}: schema collision: {name}')
            spec['components']['schemas'][name] = copy.deepcopy(schema)
        for item in fragment.get('operations', []):
            entry = resolve_http(copy.deepcopy(item))
            method, route = entry.pop('method').lower(), entry.pop('path')
            replace = entry.pop('replaceOperation', False)
            if method not in ('get', 'post', 'put', 'patch', 'delete') or not route.startswith('/'):
                raise ValueError(f'{path.name}: invalid method/path')
            previous = spec['paths'].get(route, {}).get(method)
            if previous and (not replace or previous['operationId'] != entry['operationId']):
                raise ValueError(f'{path.name}: operation collision: {method} {route}')
            entry.setdefault('parameters', [])
            for parameter in entry['parameters']:
                parameter.setdefault('required', False)
            entry.setdefault('tags', [fragment['taskId']])
            entry['x-contract-fragment'] = sources[-1]
            spec['paths'].setdefault(route, {})[method] = entry
            operations.append((method, route, entry))
    ids = [entry['operationId'] for methods in spec['paths'].values() for entry in methods.values()]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate operationId across fragments')
    for route, methods in spec['paths'].items():
        for method, entry in methods.items():
            headers = {p.get('name', '').lower() for p in entry['parameters'] if p.get('in') == 'header'}
            for name, schema in [('X-Request-Id', {'type': 'string', 'format': 'uuid'}), ('X-Data-Mode', {'type': 'string', 'enum': ['live', 'demo']})]:
                if name.lower() not in headers:
                    entry['parameters'].append(copy.deepcopy(header_templates.get(name.lower(), {'name': name, 'in': 'header', 'required': True, 'schema': schema})))
            if method == 'post' and 'idempotency-key' not in headers:
                entry['parameters'].append(copy.deepcopy(header_templates['idempotency-key']))
            if method in ('patch', 'delete') and 'if-match' not in headers:
                entry['parameters'].append(copy.deepcopy(header_templates['if-match']))
            for code in ('400', '401', '403', '404', '500'):
                entry['responses'].setdefault(code, {'description': '共通エラー', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/ErrorEnvelope'}}}})
            entry['security'] = [] if entry.get('x-local-session-bootstrap') else [{'localLiveSession': []}, {'localDemoSession': []}]
            entry['x-common-open-questions'] = [q for q in entry.get('x-common-open-questions', []) if q not in ('Q01', 'Q02')]
            entry['x-core-contract-version'] = '0.3.0'
    spec['components']['securitySchemes'] = {
        'localLiveSession': {'type': 'apiKey', 'in': 'cookie', 'name': 'sodateru_session_live'},
        'localDemoSession': {'type': 'apiKey', 'in': 'cookie', 'name': 'sodateru_session_demo'},
    }
    spec['info']['version'] = '0.3.0'
    spec['info']['description'] = '機能別契約の合成結果。契約の存在は各APIの実装完了を意味しない。COREのローカル本人開始方式はQ01/Q02仕様を参照。'
    spec['x-authentication-status'] = 'CORE: server-registered local profile session; cookie must match X-Data-Mode. Public-service authentication and profile lifecycle remain separate Q01 scope.'
    spec['x-contract-fragments'] = sources
    lines = ['# 機能別契約断片', '', '自動生成。契約の存在と機能の実装・接続完了は別。', '']
    for method, route, entry in operations:
        lines += [f'## {entry["operationId"]}', '', f'`{method.upper()} /api/v1{route}`', '', entry.get('summary', ''), '', entry.get('description', ''), '']
    (root / 'endpoints/08_fragments.md').write_text('\n'.join(lines))
    return spec
