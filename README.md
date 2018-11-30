# serverless-blog

A static site generator for microblogs running on AWS Lambda.

## Why?

Static site generators are pretty great: with all of the content pre-generated, your site is easy to host and loads super fast for visitors.

However, most static site generators require you to be at your computer to make and deploy changes to your site. I want to be able to post to my site while on the go!

## What?

This project is an attempt to create a static site generator that is powered by AWS Lambda functions rather than a CLI tool. The goal is to be able to operate almost entirely within the free limits of AWS, so we're using:

* AWS Lambda for running our API functions
* AWS API Gateway for providing an HTTP API for our functions
* AWS DynamoDB for storing raw site data like posts and pages
* AWS S3 for storing templates and hosting the generated site

I don't know how this would scale if it were serving more users than one, but for my personal use, it's pretty cool.
