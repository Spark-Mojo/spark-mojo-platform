#!/usr/bin/env python3
"""Walk story fixture files and idempotently upsert Item records into ERPNext admin site."""

import argparse
import glob
import json
import logging
import os
import sys

import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def build_session(admin_site: str, api_key: str, api_secret: str) -> httpx.Client:
    base_url = f"https://{admin_site}"
    return httpx.Client(
        base_url=base_url,
        headers={"Authorization": f"token {api_key}:{api_secret}"},
        timeout=30.0,
    )


def upsert_item(client: httpx.Client, record: dict, dry_run: bool, source_path: str) -> str:
    item_code = record.get("item_code", "")
    if not item_code:
        log.error("record missing item_code in %s", source_path)
        return "failed"

    if dry_run:
        log.info("[DRY-RUN] would upsert %s from %s", item_code, source_path)
        return "dry_run"

    try:
        resp = client.get(f"/api/resource/Item/{item_code}")
        if resp.status_code == 200:
            payload = {k: v for k, v in record.items() if k != "doctype"}
            put_resp = client.put(f"/api/resource/Item/{item_code}", json=payload)
            put_resp.raise_for_status()
            log.info("upserted %s from %s", item_code, source_path)
            return "upserted"
        elif resp.status_code == 404:
            post_resp = client.post("/api/resource/Item", json=record)
            post_resp.raise_for_status()
            log.info("upserted %s from %s", item_code, source_path)
            return "upserted"
        else:
            resp.raise_for_status()
            return "failed"
    except httpx.HTTPStatusError as exc:
        log.error(
            "failed %s from %s: HTTP %d - %s",
            item_code, source_path, exc.response.status_code,
            exc.response.text[:200],
        )
        return "failed"
    except httpx.RequestError as exc:
        log.error("failed %s from %s: %s", item_code, source_path, exc)
        return "failed"


def load_fixtures(stories_dir: str, admin_site: str, dry_run: bool) -> int:
    api_key = os.environ.get("ADMIN_FRAPPE_API_KEY")
    api_secret = os.environ.get("ADMIN_FRAPPE_API_SECRET")

    if not api_key:
        log.error("missing ADMIN_FRAPPE_API_KEY")
        return 1
    if not api_secret:
        log.error("missing ADMIN_FRAPPE_API_SECRET")
        return 1

    pattern = os.path.join(stories_dir, "*", "billing-fixture.json")
    fixture_files = sorted(glob.glob(pattern))

    if not fixture_files:
        log.warning("no billing-fixture.json files found in %s", stories_dir)
        print("Processed 0 fixtures, upserted 0 items, skipped 0 items, failed 0 items.")
        return 0

    client = None if dry_run else build_session(admin_site, api_key, api_secret)

    total_fixtures = len(fixture_files)
    upserted = 0
    skipped = 0
    failed = 0

    for fpath in fixture_files:
        try:
            with open(fpath) as f:
                records = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            log.error("cannot read %s: %s", fpath, exc)
            failed += 1
            continue

        if not isinstance(records, list):
            log.error("fixture %s is not a JSON array", fpath)
            failed += 1
            continue

        for record in records:
            result = upsert_item(client, record, dry_run, fpath)
            if result == "upserted" or result == "dry_run":
                upserted += 1
            elif result == "skipped":
                skipped += 1
            else:
                failed += 1

    if client:
        client.close()

    print(
        f"Processed {total_fixtures} fixtures, upserted {upserted} items, "
        f"skipped {skipped} items, failed {failed} items."
    )
    return 1 if failed > 0 else 0


def main():
    parser = argparse.ArgumentParser(
        description="Load billing fixture Items into ERPNext admin site",
    )
    parser.add_argument(
        "--stories-dir", required=True,
        help="Path to stories directory with billing-fixture.json files",
    )
    parser.add_argument(
        "--admin-site", default="admin.sparkmojo.com",
        help="Admin site hostname (default: admin.sparkmojo.com)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Log what would be upserted without calling the API")
    args = parser.parse_args()

    sys.exit(load_fixtures(args.stories_dir, args.admin_site, args.dry_run))


if __name__ == "__main__":
    main()
