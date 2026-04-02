# PWD-YML-UPDATE: Switch to Custom Frappe Image

After `Dockerfile.frappe` lands in main, follow these steps on the VPS to switch
all Frappe containers to the custom image.

## Prerequisites

- SSH access to the VPS: `ssh sparkmojo`
- ~4GB free disk space (custom image is significantly larger than the base image
  due to 8 additional ecosystem apps — expect ~3-4GB total)
- 10-15 minutes for the build (cloning + pip installing 8 apps)

## Step 1: Build the custom image on the VPS

```bash
ssh sparkmojo
cd /home/ops/spark-mojo-platform
git pull origin main
./scripts/build-frappe-image.sh
```

Verify the image exists:
```bash
docker images sparkmojo/frappe-custom
```

Expected output: two tags — `v16.10.1` and `v16.10.1-YYYYMMDD`.

## Step 2: Update pwd.yml

Replace the base image reference in all Frappe service containers:

```bash
cd /home/ops/frappe-poc
sed -i 's|image: frappe/erpnext:v16.10.1|image: sparkmojo/frappe-custom:v16.10.1|g' pwd.yml
```

Verify the change:
```bash
grep 'image:' pwd.yml
```

Expected: all Frappe services (backend, scheduler, queue-short, queue-long,
websocket, frontend, configurator, create-site) should show
`sparkmojo/frappe-custom:v16.10.1`.

**Do NOT change the db or redis images** — those are not Frappe app containers.

## Step 3: Recreate containers

```bash
cd /home/ops/frappe-poc
sudo docker compose -f pwd.yml down
sudo docker compose -f pwd.yml up -d
```

Wait for all containers to stabilize (~30 seconds), then verify:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep frappe
```

All containers should show "Up" without "Restarting".

## Step 4: Verify apps are loaded

```bash
docker exec frappe-poc-backend-1 cat /home/frappe/frappe-bench/sites/apps.txt
```

Expected: `frappe`, `erpnext`, plus all 8 ecosystem apps (telephony, payments,
crm, helpdesk, lms, wiki, hrms, healthcare). The configurator service generates
this from the apps directory automatically.

## Step 5: Re-run deploy.sh for SM apps

The custom image does NOT include SM custom apps. After container recreation,
run deploy.sh to sync them:

```bash
cd /home/ops/spark-mojo-platform
./deploy.sh --phase 2
./deploy.sh --phase 3
./deploy.sh --phase 4
```

Then verify everything end-to-end:
```bash
./deploy.sh --verify-only
```

## Rollback

If the custom image causes issues, revert pwd.yml to the base image:

```bash
cd /home/ops/frappe-poc
sed -i 's|image: sparkmojo/frappe-custom:v16.10.1|image: frappe/erpnext:v16.10.1|g' pwd.yml
sudo docker compose -f pwd.yml down
sudo docker compose -f pwd.yml up -d
```

Then manually re-install ecosystem apps in all containers (the same process
used in the INFRA-009 hotfix — docker cp from backend + pip install in each
worker container).

## Notes

- The VPS remains on the old image (and vulnerable to the restart loop) until
  these steps are executed manually.
- SM custom apps (`sm_widgets`, `sm_connectors`, `sm_provisioning`, `sm_billing`)
  still need `deploy.sh --phase 2` after ANY container recreation, even with
  the custom image. This is by design (DECISION-021) — SM apps change frequently.
- Future: DECISION-022 will add CI/CD to build and push the image automatically.
