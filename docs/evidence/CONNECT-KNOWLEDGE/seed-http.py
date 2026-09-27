"""Create isolated acceptance fixtures via real APIs; never point at a shared DB."""
import http.cookiejar, json, time, urllib.request, uuid
from pathlib import Path
origin = 'http://127.0.0.1:3197/api/v1'
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def request(method, path, body=None, version=None):
    headers = {'X-Request-Id': str(uuid.uuid4()), 'X-Data-Mode': 'live', 'Idempotency-Key': str(uuid.uuid4())}
    if body is not None: headers['Content-Type'] = 'application/json'
    if version is not None: headers['If-Match'] = '"' + str(version) + '"'
    req = urllib.request.Request(origin + path, None if body is None else json.dumps(body).encode(), headers=headers, method=method)
    try:
        with client.open(req) as response: return response.status, json.load(response)
    except urllib.error.HTTPError as error: return error.code, json.load(error)
if __name__ == '__main__':
    assert request('POST', '/session', {'profileKey': 'self'})[0] in (200, 201)
    assert request('POST', '/places', {'id': 'knowledge-map-place', 'mode': 'manual', 'name': '検証用の港', 'position': {'longitude': 139.64, 'latitude': 35.45}, 'address': None, 'buildingKey': None})[0] == 201
    now = int(time.time() * 1000)
    statuses = {}
    for index in range(110):
        record = dict(id=f'knowledge-map-{index:03}', kind='experience', visitId=None, placeId='knowledge-map-place' if index < 105 else None, occurredAt=now, endedAt=None, timePrecision='exact', body=f'検証マップ投稿 {index:03}', purposes=[], activities=[], impression='', periodAnswers={}, bookmarked=False, useForSuggestions=False, topicKey=None, visibility='public', sharedWith=[])
        status, payload = request('POST', '/records', record)
        assert status == 201, payload
        statuses[str(status)] = statuses.get(str(status), 0) + 1
    query = '?q=' + urllib.parse.quote('検証マップ') + '&audience=public&includeUndated=true'
    first_status, first = request('GET', '/shared-records' + query + '&limit=100')
    second_status, second = request('GET', '/shared-records' + query + '&limit=100&cursor=' + urllib.parse.quote(first['nextCursor']))
    map_status, map_data = request('GET', '/shared-records/map' + query)
    summary = {'postRecordStatusCounts': statuses, 'list': {'status': first_status, 'page1': len(first['items']), 'page2Status': second_status, 'page2': len(second['items']), 'total': first['totalCount']}, 'map': {'status': map_status, 'located': len(map_data['data']['items']), 'total': map_data['data']['totalCount']}}
    assert summary['list']['page1'] == 100 and summary['list']['page2'] == 10
    assert summary['map']['located'] == 105 and summary['map']['total'] == 110
    Path('docs/evidence/CONNECT-KNOWLEDGE/http-seed-results.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps(summary))
