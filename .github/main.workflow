workflow "Run tests on push" {
  on = "push"
  resolves = ["Run tests"]
}

action "Run tests" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  args = "test"
}
