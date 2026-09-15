# 発見カードのURI Schema互換修正

EXPLORATION #102が実provider HTTP400 invalid_json_schema（sources.items.properties.url.anyOf[0]、uri is not a valid format）を特定した。共通providerへ渡すcloneだけからstringのformat:uriを除去する。

元Schemaは変更せず、実行器のAjv/ajv-formatsによるURI検証とpattern検証を維持。date-timeなど他formatも維持する。限定回帰は修正前1失敗→修正後3成功。不正URIとpattern不一致は元検証で拒否、正しいHTTPS URIは成功。実モデル/providerは変更せず、実発見の再実行は#102担当へ提供後に引き継ぐ。
