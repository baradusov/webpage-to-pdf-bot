# Changelog
This project adheres to [Semantic Versioning](http://semver.org/).

## 0.18.0
* Added ability to screenshot full page in png

## 0.17.0
* Moved to new parser

## 0.16.0
* Updated dependencies
* Moved to grammy

## 0.15.1
* Change restart command

## 0.15.0
* Change webhook mode to long polling
* Add ability disable/enable bot with env

## 0.14.0
* Disabled the bot...
* Removed donation

## 0.13.4
* Handle SIGTERM and SIGINT

## 0.13.3
* Send message if bot catched fetch error

## 0.13.2
* Changed about info

## 0.13.1
* Changed a log message
* Prevent non-html content type to be downloaded

## 0.13.0
* Added date and time to PDF

## 0.12.1
* Changed chat.id to user.id

## 0.12.0
* Added ability to work in group chats
* Changed log message
* Changed support command to donate

## 0.11.2
* Better logging

## 0.11.1
* Added additional logging

## 0.11.0
* Decreased timeout
* Added throttler

## 0.10.2
* Updated dependencies

## 0.10.1
* Fix images don't showing cause lazy attribute

## 0.10.0
* Upgraded Telegraf.js
* Updated dependencies

## 0.9.0
* Change jsdom user-agent to chrome's one
* Ignore non-valid ssl

## 0.8.13
* Fix bot not resoponding due to Telegram read timeout
* Log Telegraf errors to stderr

## 0.8.12
* Log update when sending pdf

## 0.8.11
* Add context for errors

## 0.8.10
* Print errors to stderr instead of stdout

## 0.8.9
* Changed deploy event on release published 
* Updated dependencies

## 0.8.8
* Updated dependencies

## 0.8.7
* Updated dependencies
* Restart only pdf bot
* Enable timestamps for logs

## 0.8.6
* Upgraded Puppeteer to 8.0.0

## 0.8.5
* Fixed network timeout error
* Changed message to admin
* Updated dependencies

## 0.8.4
* Changed `npm install` to `npm ci` for prod deployment

## 0.8.3
* Updated dependencies

## 0.8.2
* Fixed order webhook

## 0.8.1
* Updated package-lock.json

## 0.8.0
* Migrated from Vercel to Express
* Added support for new languages with help of Noto Fonts
* Replaced chrome-aws with puppeteer

## 0.7.2
* Updated dependencies

## 0.7.1
* Moved allowed updates to config constant
* Updated dependencies

## 0.7.0
* Added source url at end of file
* Added chat action when sending file

## 0.6.0
* Rewrite the bot to be more extensible for future updates
* Connected database for storing user profiles and preferences for future
* Added help text (/help command)
* Added ability to support the bot with /support command
* Bot will send message to admin now if it's down
* Removed logging to airtable
* Created telegram channel for updates

## 0.5.0
* Add support for bengali language
* Change font fetching to parallel with .allSettled
* Migrate from now to vercel

## 0.4.5
* Fix logging error message
* Fix processing forwarded message

## 0.4.4
* Fix logging error message
* Add repository field to package.json

## 0.4.3
* Refactoring for more modular approach

## 0.4.2
* Fix start command not sending welcome message
* Update dependencies

## 0.4.1
* Fix hindi font support

## 0.4.0
* Add hindi font support
* Add botStart log event

## 0.3.1
* Fix overflowing images
* Possible fix of unhandled promise rejection

## 0.3.0
* Bot now will reply to message with url
* Fix code styling in pdf
* Reduce setTimeout time to prevent timeout error
* Add new logging system

## 0.2.4
* Fix missed message text

## 0.2.3
* Fix reply message text to be more informative

## 0.2.2
* Add missing logging

## 0.2.1
* Fix lambda timeout error
* Change info on index page


## 0.2.0
* Add logging to getReadableContent
* Change info to package.json
* Fix invalid url error

## 0.1.0
* Initial release.