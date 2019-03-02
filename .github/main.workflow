workflow "Run tests on push" {
  on = "push"
  resolves = ["Deploy to production"]
}

action "Install dependencies" {
  uses = "actions/npm@master"
  args = "ci"
}

action "Run tests" {
  needs = "Install dependencies"
  uses = "actions/npm@master"
  args = "test"
}

action "Deploy to production" {
  uses = "actions/npm@master"
  needs = ["Run tests"]
  args = "run deploy"
  secrets = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "HONEYCOMB_WRITE_KEY", "JWT_SECRET"]
  env = {
    AWS_DEFAULT_REGION = "us-east-1"
  }
}
