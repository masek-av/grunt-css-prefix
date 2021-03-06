/*
 * prefix a css file
 * -----------------------
 * Copyright (c) 2013 Anas Nakawa
 * Licensed under the MIT license.
 */

'use strict';

// --------------------------
// attempt to process all css
// selectors, and prefix them
// with a given string
// --------------------------

// external modules
var rework = require( 'rework' )
, str = require( 'underscore.string' )

// Class definition
//
// * **param:** {string}   file    content of the file
// * **param:** {object}   options
, Prefixer = function( file, options ) {
  this.file = file;
  this.options = options;
};

// Helper method to register prefixer handler
//
// * **param:** {string}   ruleName
// * **param:** {function} handler
Prefixer.registerRuleHandler = function( ruleName, handler ) {
  Prefixer.prototype[ ruleName + 'RuleHandler' ] = handler;
}

// call target rule handler
//
// * **param:** {object} rule
Prefixer.prototype.processRule = function( rule ) {
  return this.getRuleHandler( rule ).call( this, rule );
};

// get target rule handler if exist
//
// * **param:** {object} rule 
Prefixer.prototype.getRuleHandler = function( rule ) {
  if( rule && rule.type ) {
    return this[ rule.type + 'RuleHandler' ];  
  }
};

// check wither a handler exist for current rule
//
// * **param:** {object} rule
Prefixer.prototype.isHandlerExist = function( rule ) {
  return typeof this.getRuleHandler( rule ) === 'function';
};

// Prefixer main method that will iterate over all rules
Prefixer.prototype.processFile = function() {
  var self = this;
  return function( styles ) {
    styles.rules.forEach( function( rule ) {
      // call out our rule handler
      if( self.isHandlerExist( rule ) ) {
        self.processRule( rule );
      }
    });   
  }
};

// process a given name with `undersocre.string` methods
//
// * **param:** {string} name
Prefixer.prototype.processName = function( name ) {
  if( str[ this.options.processName ] == null ) {
    throw new Error( 'could not find a method for the option processName: ' + this.options.processName );
  }

  // trick to keep all spaces
  name = name.replace( / /g, '/' );
  name = str[ this.options.processName ]( name );
  name = name.replace( /\//g, ' ' );
  return name;
};

// generate a mixin specific for `rework` for a given property
// without any vendor prefix
//
// * **param:** {string} propName   css property name to generate the mixin for
Prefixer.prototype.mixin = function( propName ) {
  var self = this
  , temp   = {}
  , noop   = function() {}
  , fn     = function( type ) {
    var prop = {};
    prop[ propName ] = self.options.prefix + self.processName( type )
    return prop;
  };

  temp[ '-webkit-' + propName ] = noop;
  temp[    '-moz-' + propName ] = noop;
  temp[     '-ms-' + propName ] = noop;
  temp[      '-o-' + propName ] = noop;
  temp[              propName ] = fn;

  return temp;
};

// rule handlers
// -------------
Prefixer.registerRuleHandler( 'rule', function( rule ) {
  // prefixing class names
  for( var i = 0, len = rule.selectors.length; i < len; i++ ) {
    // strip
    if( this.options.strip ) {
      rule.selectors[ i ] = rule.selectors[ i ].split( this.options.strip ).join( '' );
    }

    // adding prefix

//  PRE options.ignore version
//    rule.selectors[ i ] = this.processName( rule.selectors[ i ] ).split( '.' ).join( '.' + this.options.prefix );

    var splits = this.processName( rule.selectors[ i ] ).split( '.' );
    for(var m= 1, n=splits.length; m<n; m++) {
        var skip = false;
        for(var j= 0,k=this.options.ignore.length; j<k; j++){
          if(splits[m].indexOf(this.options.ignore[j]) == 0) {
            skip = true;
            break;
          }
        }
        if(!skip) splits[m] = this.options.prefix + splits[m];
    }
    rule.selectors[ i ] = splits.join('.');
  }
});

Prefixer.registerRuleHandler( 'keyframes', function( rule ) {
	/* 
	 *
	 * Cranch for rework-visit issue ( while this patch isn't in NPM repository )
	 * https://github.com/reworkcss/rework-visit/commit/c8cebd42e31cf638238f64b36fbecdf10214fa1b
	 *
	 */
	for (var i=0; i<rule.keyframes.length; i++ ) {
		var keyframe = rule.keyframes[ i ];
		if ( keyframe.type === 'comment' ) {
			keyframe.declarations = [];
		}
	}
  // prefixing keyframe names
  rule.name = this.options.prefix + this.processName( rule.name );

  // DO NOT PREFIX KEYFRAMES.... FOR NOW - TODO
  //rule.name = this.processName( rule.name );
});

// Unwrap media queries and process their attached rules
Prefixer.registerRuleHandler( 'media', function( rule ) {
  
	for( var i = 0; i < rule.rules.length; i++ ) {
		var childRule = rule.rules[i];
		if( this.isHandlerExist( childRule ) ) {
      this.processRule(childRule);
    }
	}
});

module.exports = function( file, options ) {
  var prefixerInstance = new Prefixer( file, options )
  , reworkInstance = rework( file );

  reworkInstance
    .use( prefixerInstance.processFile() )
    .use(
      rework.mixin(
        prefixerInstance.mixin( 'animation-name' )
      )
    )
    .use(
      rework.prefix( 'animation-name', options.vendor )
    );

  return reworkInstance.toString();
}
