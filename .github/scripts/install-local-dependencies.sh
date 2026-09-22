#!/usr/bin/env bash
set -euo pipefail
# Run from the repository root after downloading the pinned JARs.
# Hash-qualified versions prevent different private JARs sharing a Maven cache key.
sha256sum --check .github/dependencies.sha256

mvn -B --no-transfer-progress org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file \
    -Dfile="libs/BungeeCord.jar" -DgroupId="net.md-5" -DartifactId="bungeecord-chat" \
    -Dversion="1.20-R0.1-tfmc-3bc6fa2477eb" -Dpackaging=jar -DgeneratePom=true "$@"
