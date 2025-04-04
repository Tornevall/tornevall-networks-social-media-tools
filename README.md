# SocialGPT ChatGPT Integration for Chrome

## Requirements

* Access to the ChatGPT API.
* A secret key.
* Money (Yeah, there is a subscription fee for the API).

## What is this?

SocialGPT is a Chrome extension designed to simplify social media discussions. The basic goal of this extension is to
allow users to select content they wish to comment on and then, for example, request a simplified version of their own
comment.

As of April 2025, the project is still in its early stages and is built in a very basic form. The initial focus has been
on automating the data flow as much as possible. The challenge has been getting Facebook to work reasonably well with
the code. Facebook uses its own interface for injecting text into comment fields, which likely won’t work properly in
other contexts. This hasn’t been addressed yet, but the plan is to separate the code to handle special cases like
Facebook once that milestone is reached.

## How does it work?

Currently, the extension works by requiring you to input your secret key provided by OpenAI. You also need to have a
project set up through which all OpenAI API calls are routed. Eventually, this can of course be centralized using a
general server that handles all requests, but that’s something for later. Since OpenAI is not free, some costs are
associated wit
h using the extension.

The second thing you currently need to do - unless you opt to use the default settings - is enter your name and a "
default behaviour". This behaviour defines the base template for comments that will be posted when you activate the
tool. Your name is used to identify you, so ChatGPT knows who you are and who will be addressed in the comment thread.

At the moment, you right-click, choose SocialGPT’s context menu, and select the comments relevant to future
communication. Then you essentially click "reply to this" so ChatGPT knows which element to focus on. From there, the
Chrome extension tries to locate the correct comment field.

Primitive? Absolutely! But it might evolve. That’s why this project is open on GitHub. Also, I'm not particularly
skilled in frontend development myself, which is why this project was initially started with help from ChatGPT.

## Where does it work?

"Work"-ish. It works, but probably not perfect. It's been tested with Facebook. It turns out that if also works
interestingly fine with Twitter/X.

## TO DO

* Compatibility? (X, BlueSky, Facebook, LinkedIn, Reddit, etc.)
* Centralize the API key and project ID to avoid having to enter them every time.
