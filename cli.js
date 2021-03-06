#!/usr/bin/env node
'use strict';
var conventionalCommitsTemplate = require('./');
var fs = require('fs');
var meow = require('meow');
var path = require('path');
var split = require('split');

var cli = meow({
  help: [
    'Usage',
    '  conventional-commits-template [<path>...]',
    '',
    'Example',
    '  conventional-commits-template commits.ldjson -v 1.0.0',
    '  cat commits.ldjson | conventional-commits-template -v 1.0.0',
    '',
    'Options',
    '',
    '-v, --ver        Version number of the up-coming release',
    '-t, --context    A filepath of a json that is used to define template variables',
    '-o, --options    A filepath of a javascript object that is used to define options'
  ].join('\n')
}, {
  alias: {
    v: 'ver',
    c: 'context',
    o: 'options'
  }
});

var filePaths = cli.input;
var length = filePaths.length;
var flags = cli.flags;
var version = flags.ver;

var templateContext;
var contextPath = flags.context;
if (contextPath) {
  try {
    templateContext = require(path.join(process.cwd(), contextPath));
  } catch (err) {
    console.error('Failed to get context from file ' + contextPath + '\n' + err);
    process.exit(1);
  }
}

var options;
var optionsPath = flags.options;
if (optionsPath) {
  try {
    options = require(path.join(process.cwd(), optionsPath));
  } catch (err) {
    console.error('Failed to get options from file ' + optionsPath + '\n' + err);
    process.exit(1);
  }
}

try {
  var stream = conventionalCommitsTemplate(version, templateContext, options);
} catch (err) {
  console.error(err.toString());
  process.exit(1);
}

function processFile(fileIndex) {
  var filePath = filePaths[fileIndex];
  fs.createReadStream(filePath)
    .on('error', function(err) {
      console.warn('Failed to read file ' + filePath + '\n' + err);
      if (++fileIndex < length) {
        processFile(fileIndex);
      }
    })
    .pipe(split(JSON.parse))
    .on('error', function(err) {
      console.warn('Failed to split commits in file ' + filePath + '\n' + err);
    })
    .pipe(stream)
    .on('error', function(err) {
      console.warn('Failed to process file ' + filePath + '\n' + err);
      if (++fileIndex < length) {
        processFile(fileIndex);
      }
    })
    .on('end', function() {
      if (++fileIndex < length) {
        processFile(fileIndex);
      }
    })
    .pipe(process.stdout);
}

if (!version) {
  console.error('No version specified');
  process.exit(1);
} else if (!process.stdin.isTTY) {
  process.stdin
    .pipe(split(JSON.parse))
    .on('error', function(err) {
      console.error('Failed to split commits\n' + err);
      process.exit(1);
    })
    .pipe(stream)
    .on('error', function(err) {
      console.error('Failed to process file\n' + err);
      process.exit(1);
    })
    .pipe(process.stdout);
} else if (length === 0) {
  console.error('You must specify at least one line delimited json file');
  process.exit(1);
} else {
  processFile(0);
}
