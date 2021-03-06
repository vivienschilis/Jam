/*  Jam JavaScript Widget library, version 0.2.1
 *  (c) 2010 Oliver Nightingale
 *
 *  Released under MIT license.
 */

Jam = {
  version: '0.2.1',
  newObjectFrom: function (oldObject) {
    function F() {};
    F.prototype = oldObject;
    return new F();
  }
}
Jam.Base = function (name, options) {
  var base = {};
  var containerSelector = options.containerSelector || 'body';
  var eventHandler = options.eventHandler || $(document);
  var errorPrefix = 'Jam.Base';
  var name = name;
  var templateSelector = options.templateSelector;
  var template = $(templateSelector);
  var widget = options.widget;
  var eventNamespace = function () {
    return name + ':' + widget;
  };

  var populate = function () {

  };

  base.bind = function (eventName, callback) {
    eventHandler.bind(eventName + '.' + eventNamespace(), callback);
    return this;
  };

  base.htmlClass = function (className) {
    return name + ' ' + widget + '-' + className;
  };

  base.container = function () {
    return $(containerSelector);
  };

  base.generateHtml = function () {
    populate.call(this);
    addBehaviour.call(this);
    return this.html;
  };

  base.html = template.clone();

  base.insertHtml = function () {
    this.container().html(this.html);
  };

  base.options = function () {
    return options;
  };

  base.render = function () {
    this.generateHtml();
    this.insertHtml();
  };

  base.remove = function () {
    this.html.remove();
    eventHandler.unbind('.' + eventNamespace());
  };

  base.resetHtml = function () {
    this.html = template.clone();
  };

  base.trigger = function (eventName, data) {
    eventHandler.trigger(eventName + '.' + eventNamespace(), data);
  };

  return base;
};
Jam.CollectionView = function (name, options) {
  var collectionView = Jam.newObjectFrom(Jam.Base(name, options));
  var collection = options.collection || []

  collectionView.collectionIsEmpty = function () {
    return collection.length === 0
  }

  collectionView.collection = function () {
    return collection;
  }

  collectionView.emptyCollection = function () {
    collection = [];
    this.trigger('collectionEmptied')
  };

  collectionView.setCollection = function (newCollection) {
    collection = newCollection;
    this.trigger('collectionUpdated', collection);
    return collection;
  };

  collectionView.updateCollection = function (newCollection) {
    collection = newCollection
    this.trigger('collectionUpdated', collection);
    this.resetHtml()
    this.render()
    return collection;
  };

  return collectionView;
}
Jam.GridView = function (name, options) {
  var defaults = {
    paginationSpeed: 800,
    paginationEasing: 'swing',
    paginationSeparator: '...',
    paginationInnerWindow: 4,
    paginationOuterWindow: 1
  }
  var options = $.extend(defaults, options, {'widget': 'grid-view'})
  var gridView = Jam.newObjectFrom(Jam.CollectionView(name, options))
  var currentPage = 1
  var perPage = parseInt(options.perPage) || 1
  var self = this
  var pageTemplate = $('<ul class="grid-view-page clearfix"></ul>')
  var pageControlsTemplate = $('<div class="grid-view-page-controls"><a href="#" class="page-link backward">Prev</a><a href="#" class="page-link forward">Next</a></div>')
  var girdItemWidth = parseInt(gridView.options().pageWidth) / gridView.options().gridWidth + 'px'
  var gridItemWrap = $('<li class="grid-view-item"></li>').css({
    'float': 'left',
    'width': girdItemWidth
  })

  var addStyles = function () {
    this.container().css({
      'width': options.pageWidth
    })
    this.html
      .find('.grid-page-holder')
        .css({
          'min-width': '10000px',
          'position': 'absolute'
        })
        .end()
      .find('.grid-view-port')
        .css({
          'overflow': 'hidden',
          'position': 'relative',
          'width': options.pageWidth,
          'height': options.pageHeight
        })
        .end()
      .find('.grid-view-page')
        .css({
          'padding': '0px',
          'float': 'left',
          'width': options.pageWidth,
          'height': options.pageHeight
        })
  }

  var displayCurrentPage = function () {
    if (currentPage > pagesRequired()) { currentPage = pagesRequired() };
    this.html.find('.grid-page-holder').css({'left': pagePosition(currentPage)});
  };

  var drawBlankState = function () {
    if (options.blankStateHtml) {
      this.html.find('.grid-page-holder')
        .append(pageTemplate.clone().append(options.blankStateHtml));
    };
  };

  var drawPage = function (pageNum) {
    var startIndex = (pageNum - 1) * options.perPage;
    var endIndex = pageNum * options.perPage;
    var pageHtml = pageTemplate.clone();

    pageHtml.attr('id', 'grid-view-page-' + pageNum);
    $.each(this.collection().slice(startIndex, endIndex), function () {
      pageHtml.append(gridItemWrap.clone().append(options.gridItemHtml(this).css({
        'margin-left': 'auto',
        'margin-right': 'auto'
      })));
    });

    this.html.find('.grid-page-holder').append(pageHtml);
  }

  range = function (start, stop, step) {
       if (arguments.length <= 1) {
         stop = start || 0;
         start = 0;
       }
       stop=stop+1
       step = arguments[2] || 1;

       var len = Math.max(Math.ceil((stop - start) / step), 0);
       var idx = 0;
       var range = new Array(len);

       while(idx < len) {
         range[idx++] = start;
         start += step;
       }

       return range;
   }

  var hideInvisiblePages = function (controlsHtml) {
   var visiblePages = visiblePageNumbers();
   var totalPages = pagesRequired()
   var newRange=0

   $('.page-link-separator').remove();

   for(var i=1; i <= totalPages; i++) {
     var pageLink = controlsHtml.find('.page-link-' + i)
     if($.inArray(i, visiblePages) < 0){
       newRange=1
       pageLink.hide();
     }
     else{
       if(newRange==1){
         pageLink.before($('<a href="#" class="page-link-separator">'+options.paginationSeparator+'</a>'))
       }
       newRange=0
       pageLink.show();
     }
   }
  }

  var visiblePageNumbers = function() {
   var innerWindow = options.paginationInnerWindow;
   var outerWindow = options.paginationOuterWindow;
   var windowFrom = currentPage - innerWindow;
   var windowTo = currentPage + innerWindow;

   var totalPages = pagesRequired()

   if(windowTo > totalPages) {
     windowFrom = windowFrom - (windowTo - totalPages);
     windowTo = totalPages;
   }

   if( windowFrom < 1 ) {
     windowTo = windowTo + (1 - windowFrom)
     windowFrom = 1
     if(windowTo > totalPages)
       windowTo = totalPages
   }

   var visiblePages = range(1,totalPages);
   var leftGap = range((1+outerWindow), windowFrom);
   var rightGap = range((windowTo+1), (totalPages - outerWindow));

   if(rightGap[rightGap.length -1] - rightGap[0] >= 0){
     for(var i=rightGap.length-1; i>= 0; i--){
       visiblePages.splice(rightGap[i]-1,1)
     }
   }

   if(leftGap[leftGap.length -1] - leftGap[0] >= 0){
     for(var i=leftGap.length-1; i>= 0; i--){
       visiblePages.splice(leftGap[i]-1,1)
     }
   }

   return visiblePages;
  }


  var drawPaginationControls = function () {
    var self = this
    var visiblePages = visiblePageNumbers();

    if (pagesRequired() > 1) {
      var controlsHtml = pageControlsTemplate.clone()
      for (var i=1; i <= pagesRequired(); i++) {
        if($.inArray(i, visiblePageNumbers))  {
          var pageLink = $('<a href="#" class="page-link"></a>')
          pageLink
            .text(i)
            .addClass(i == currentPage ? 'current' : '')
            .addClass('page-link-' + i)
          controlsHtml.find('.forward').before(pageLink)
          hideInvisiblePages(controlsHtml);
        }
      };

      if (this.html.find('.grid-view-page-controls') > 0) {
        this.html.find('.grid-view-page-controls').replaceWith(controlsHtml)
      } else {
        this.html.append(controlsHtml)
      };
    }
  }

  var addPaginationBehaviour = function () {
    var self = this
    var page
    var controlsHtml = this.html.find('.grid-view-page-controls')
    controlsHtml.unbind('click')
    controlsHtml.bind('click', function (event) {
      var target = $(event.target)
      if ($(this) !== target) {
        if (target.hasClass('backward')) {
          if (self.canPageBackward()) {
            page = previousPageNum()
            self.trigger('paginate', previousPageNum())
          };
        } else if (target.hasClass('forward')) {
          if (self.canPageForward()) {
            page = nextPageNum()
            self.trigger('paginate', nextPageNum())
          };
        } else if (target.hasClass('page-link')) {
          page = parseInt(target.text())
          self.trigger('paginate', parseInt(target.text()))
        };
        self.showPage(page)
        controlsHtml
          .find('a')
            .removeClass('current')
          .end()
          .find('.page-link-' + page)
            .addClass('current')

        hideInvisiblePages(controlsHtml)

      };
      return false;
    })
  }

  var moreCollectionItemsRequired = function (pageNum) {
    return pageNum >= (pagesRequired() - 1);
  };

  var nextPageNum = function () {
    return parseInt(currentPage) + 1;
  };

  var pagesRequired = function () {
    var cSize = 0
    if(options.collectionSize){
      cSize = options.collectionSize;
    }
    else {
      cSize =gridView.collection().length
    }

    return Math.ceil(cSize / perPage);
  };

  var pagePosition = function (pageNum) {
    var position = -1 * ((pageNum - 1) * parseInt(options.pageWidth)) + 'px';
    return position
  };

  var previousPageNum = function () {
    return parseInt(currentPage) - 1;
  };

  gridView.canPageBackward = function () {
    return currentPage > 1;
  };

  gridView.updateCollectionSize = function (newCollectionSize) {
    options.collectionSize = newCollectionSize;
  }

  gridView.canPageForward = function () {
    return currentPage !== pagesRequired();
  };

  gridView.currentPage = function () {
    return currentPage
  }

  gridView.generateHtml = function () {
    var self = this;
    if (this.collectionIsEmpty()) {
      drawBlankState.call(this);
    } else {
      for (var i=1; i <= pagesRequired(); i++) {
        drawPage.call(this, i);
      };
      drawPaginationControls.call(this);
      addPaginationBehaviour.call(this);
      displayCurrentPage.call(this);
    };

    addStyles.call(this);
    return this.html.addClass(this.htmlClass());
  }

  gridView.showPage = function (pageNum) {
    var self = this
    var pageNum = parseInt(pageNum)
    if (pageNum <= pagesRequired() && pageNum > 0) {
      currentPage = pageNum;
      this.trigger('pageAnimationStart', pageNum);
      this.html.find('.grid-page-holder').animate({
        left: pagePosition(pageNum)
      }, options.paginationSpeed, options.paginationEasing, function () {
        self.trigger('pageAnimationEnd', pageNum);
      });
      if (moreCollectionItemsRequired(pageNum)) {
        self.trigger('collectionItemsNeeded');
      };
    } else {
      throw("cannot show a page that doesn't exist");
    };
  };

  return gridView;
}
Jam.Helper = (function ($) {
  var h = {};
  var bytesInAMegabyte = 1048576

  h.bytesToMegabytes = function (bytes) {
    return (Math.round((bytes / bytesInAMegabyte) * 100) / 100) + "MB"
  },

  h.millisecondsToHrsMinSec = function (milliseconds) {
    var duration_seconds = milliseconds / 1000
    var h = Math.floor(duration_seconds / 3600);
    var m = Math.floor(duration_seconds % 3600 / 60);
    var s = Math.floor(duration_seconds % 3600 % 60);
    return ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
  },

  h.numberToCurrency = function (number, options) {
    var settings = $.extend({}, { currency: '£' }, options || {})
    return settings.currency + new Number(number).toFixed(2)
  },

  h.pageCentreX = function (elementWidth) {
    var pageWidth = $('body').width()
    return (pageWidth / 2) - (elementWidth / 2)
  },

  h.pageCentreY = function (elementHeight) {
    var pageHeight = $('body').height()
    return (pageHeight / 2) - (elementHeight / 2)
  },

  h.timeAgoInWords = function(time){
    var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
      diff = (((new Date()).getTime() - date.getTime()) / 1000),
      day_diff = Math.floor(diff / 86400);

    if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
      return;

    return day_diff == 0 && (
        diff < 60 && "just now" ||
        diff < 120 && "1 minute ago" ||
        diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
        diff < 7200 && "1 hour ago" ||
        diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
      day_diff == 1 && "yesterday" ||
      day_diff < 7 && day_diff + " days ago" ||
      day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
  },

  h.truncateText = function (string, len) {
    var i = 0;
    var len = len || 100;
    var string = string || "";

    if (string.length <= len) {
      return string;
    } else if (string[len] !== ' ') {
      while (string[len + i] !== ' ') {
        i++;
      };
      return string.slice(0, len + i) + '…';
    } else {
      return string.slice(0, len) + '…';
    };
  },

  h.viewPortTop = function (offset) {
    return $('body').scrollTop() + offset
  }

  return h;
})(jQuery)
