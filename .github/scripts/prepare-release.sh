#!/usr/bin/env bash
set -euo pipefail
: "${GH_TOKEN:?Set DEPS_TOKEN with Contents read access to TF-Minecraft/ServerAssets}"
ref=4b80431398e4ff35d703cad915b7ee4e5924a763
mkdir -p libs
curl --fail --location --silent --show-error --retry 3 -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github.raw+json" "https://api.github.com/repos/TF-Minecraft/ServerAssets/contents/jars/822e034c64c8/BungeeCord-26.1-R0.1-SNAPSHOT-build2096.jar?ref=$ref" > "libs/BungeeCord-26.1-R0.1-SNAPSHOT-build2096.jar"
bash .github/scripts/install-local-dependencies.sh "$@"
