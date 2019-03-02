FROM debian:9.5-slim

LABEL "com.github.actions.name"="Honeymarker"
LABEL "com.github.actions.description"="Mark a build in Honeycomb using honeymarker"
LABEL "com.github.actions.icon"="paperclip"
LABEL "com.github.actions.color"="orange"

LABEL "repository"="http://github.com/mjm/serverless-blog"
LABEL "maintainer"="Matt Moriarity <matt@mattmoriarity.com>"

RUN apt-get update -qy && apt-get install -y wget
RUN wget -q https://honeycomb.io/download/honeymarker/linux/honeymarker_1.9_amd64.deb && echo '5aa10dd42f4f369c9463a8c8a361e46058339e6273055600ddad50e1bcdf2149  honeymarker_1.9_amd64.deb' | sha256sum -c && dpkg -i honeymarker_1.9_amd64.deb

ADD entrypoint.sh .
ENTRYPOINT ./entrypoint.sh
