#!/bin/sh

honeymarker \
  -k $HONEYCOMB_WRITE_KEY \
  -d $HONEYCOMB_DATASET \
  add \
  -t $HONEYCOMB_MARKER_TYPE \
  -m $GITHUB_SHA
  -u "https://github.com/${GITHUB_REPOSITORY}/commit/${GITHUB_SHA}"
  "$@"
