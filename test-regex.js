const { pathToRegexp } = require('path-to-regexp');
// try to mimic vercel's routing engine if possible, but actually Vercel uses standard regex in these sources sometimes
console.log(new RegExp('^/([^.]*)$').test('/'));
console.log(new RegExp('^/([^.]*)$').test('/auth'));
console.log(new RegExp('^/([^.]*)$').test('/api/users'));
console.log(new RegExp('^/([^.]*)$').test('/src/main.tsx'));
console.log(new RegExp('^/([^.]*)$').test('/assets/logo.png'));
