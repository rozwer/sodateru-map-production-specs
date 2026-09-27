"""stdin/stdout bridge; shared ROUTES loader is the sole feed parser."""
import sys, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]))
from server.features.routes.toei_gtfs import Fault, load_feed
from transfer_search import search_transfers
if __name__ == '__main__':
    try:
        loaded=load_feed(sys.argv[1],sys.argv[2])
        print(json.dumps(search_transfers(loaded,json.load(sys.stdin)),ensure_ascii=False))
    except Fault as error:
        print(json.dumps({'error':{'code':error.code,'message':error.message}},ensure_ascii=False))
        sys.exit(2)
