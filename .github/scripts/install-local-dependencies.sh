#!/usr/bin/env bash
set -euo pipefail
# Run from the repository root after downloading the pinned JARs.
# Hash-qualified versions prevent different private JARs sharing a Maven cache key.
sha256sum --check .github/dependencies.sha256

mvn -B --no-transfer-progress org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file \
    -Dfile="libs/BungeeCord-26.1-R0.1-SNAPSHOT-build2096.jar" -DgroupId="net.md-5" -DartifactId="bungeecord-chat" \
    -Dversion="26.1-R0.1-SNAPSHOT-build2096-tfmc-822e034c64c8" -Dpackaging=jar -DgeneratePom=true "$@"
