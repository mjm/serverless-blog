workflow "Run tests on push" {
  on = "push"
  resolves = [
    "Run tests",
  ]
}

action "Run tests" {
  needs = "Install dependencies"
  uses = "actions/npm@master"
  args = "test"
}

action "Install dependencies" {
  uses = "actions/npm@master"
  args = "ci"
}
