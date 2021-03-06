# Changelog
This project adheres to [Semantic Versioning](http://semver.org/).

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