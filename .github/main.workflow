workflow "Deploy on push" {
  on = "push"
  resolves = [
    "Deploy to production",
    "Mark in Honeycomb"
  ]
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

action "Lint" {
  needs = "Install dependencies"
  uses = "actions/npm@master"
  args = "run lint"
}

action "Deploy to production" {
  uses = "actions/npm@master"
  needs = ["Lint", "Run tests"]
  args = "run deploy"
  secrets = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "HONEYCOMB_WRITE_KEY", "JWT_SECRET"]
  env = {
    AWS_DEFAULT_REGION = "us-east-1"
  }
}

action "Mark in Honeycomb" {
  uses = "./actions/honeymarker"
  needs = ["Deploy to production"]
  secrets = ["HONEYCOMB_WRITE_KEY"]
  env = {
    HONEYCOMB_DATASET = "serverless-blog"
    HONEYCOMB_MARKER_TYPE = "deploy"
  }
}
