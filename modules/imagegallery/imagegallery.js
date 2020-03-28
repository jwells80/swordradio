(function ($) {

$.imagegallery	= {
	close: function () {
		$.modal.close();
	},
	currentImage: {},
	titleContainer: {},
	descriptionContainer: {}
};

$.fn.imagegallery = function (options) {
	var el = this,
		settings = {},
		isLocked = false,
		itemsToLoad = [];

	el.updateSettings = function(newSettings) {
		settings = $.extend(true, {}, settings, newSettings);
		setCurrentPage(settings.store.currentPage, true);
		return el;
	};

	init();

	return el;

	/**
	 * Resets loaded items
	 */
	function resetItemsToLoad() {
		itemsToLoad	= [];
	}

	/**
	 * Add item to load
	 *
	 * @param {Number} i
	 * @param {String} url
	 */
	function addItemToLoad(i, url) {
		itemsToLoad[i] = url;
	}

	/**
	 * Tells use when we already loaded item
	 *
	 * @param {Number} i
	 * @return {Boolean}
	 */
	function isItemLoaded(i) {
		return (false === itemsToLoad[i]);
	}

	/**
	 * Mark item as already loaded
	 *
	 * @param {Number} i
	 */
	function markItemAsLoaded(i) {
		itemsToLoad[i] = false;
	}

	/**
	 * When item isn`t loaded -- we load item and mark it as loaded
	 *
	 * @param {Number} i
	 */
	function loadItem(i) {
		if (0 == itemsToLoad.length) {
			throw new Error('Items to load should be loaded before loading item');
		}
		if (isItemLoaded(i)) {
			return;
		}
		$('#view-image-' + i).attr('src', itemsToLoad[i]);
		markItemAsLoaded(i);
	}

	function isDefaultTitle(title) {
		return title == settings.locale.defaultTitle;
	}

	function init() {
		settings = $.extend(true, {}, $.fn.imagegallery.defaults, options);

		var store = settings.store;

		var page = getPageNumberFromUrl(el.parent().attr('id'));
		if (page) {
			store.currentPage = page;
		}

		$(window).bind('hashchange', function() {
			setCurrentPage(getPageNumberFromUrl(el.parent().attr('id')), false);
		});

		switch (store.type) {
			case 'array':
				setCurrentPage(store.currentPage, true);
				break;
			case 'picasa':
				if (store.username === '' || store.albumId === '' || store.album === '') {
					throw new Error('Module not configured');
				}
				requestPicasaAlbum(store);
				break;
			default:
				throw new Error('Unknown store type.');
		}
	}

	function htmlEncode(str) {
		return str.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
	}

	function newLineToBr(str) {
		return str.replace(/\n/g, '<br />');
	}

	function filter(items) {
		var filteredItems = [],
			deletedImages = settings.store.deletedImages;
		for (var i = 0, iMax = items.length; i < iMax; i++) {
			var item = items[i];
			if ($.inArray(item.id, deletedImages) == -1) {
				filteredItems.push(item);
			}
		}
		return filteredItems;
	}

	function render(store) {
		var items = filter(store.data),
			listHtml = $('<div class="frames-' + settings.thumbSize + '" style="text-align: ' + settings.align +
				'"></div>'),
			frameIdPrefix = 'frame-',
			start = (store.currentPage - 1) * settings.pageSize,
			end = start + parseInt(settings.pageSize),
			iMax = items.length;

		for (var i = start; i < end && i < iMax; i++) {
			var item		= items[i],
				title		= isDefaultTitle(item.title) ? '' : item.title,
				itemHtml	= $(
				'<div id="' + frameIdPrefix + item.id + '" class="frame">' +
					'<div class="preview-holder">' +
						'<div class="preview" style="background-image: url(\'' + item.thumbUrl + '\');">' +
							'<a href="' + item.url + '">' +
								'<img src="' + item.thumbUrl + '" alt="' + title + '"/>' +
							'</a>' +
						'</div>' +
					'</div>' +
					'<div class="name">' + title + '</div>' +
					'<div class="description">' + newLineToBr(htmlEncode(item.description)) + '</div>' +
				'</div>'
			);
			itemHtml.hover(function() {
				$(this).addClass('frame-hover');
			}, function() {
				$(this).removeClass('frame-hover');
			});
			itemHtml.find('.preview').bind('click', [i], function(event) {
				if (isLocked || settings.beforeOpenImageCallback() === false) {
					return;
				}
				event.stopPropagation();
				event.preventDefault();
				openView(
						settings.isRtl ? items.slice().reverse() : items,
						convertIndexForRtl(event.data[0])
				);
			});
			listHtml.append(itemHtml);
		}

		el.html(listHtml);
		el.append(createPaging(store));
	}

	function openView(items, start) {
		document.documentElement.className.indexOf('mobile-view') > -1
			? openMobileView(items, start)
			: openDesktopView(items, start);
	}

	function openMobileView(items, start) {
		function close() {
			$.imagegallery.currentImage = currentIndex;
			$('#mobile-view').remove();
			$('body').removeClass('imagegallery-mobile-view');
			$('.site-frame').show();
		}

		function updateView() {
			var windowHeight = $(window).height(),
				windowWidth = $(window).width(),
				image = $('#mobile-view-img'),
				buttonPrev = $('#mobile-view-prev'),
				buttonNext = $('#mobile-view-next'),
				buttonMargin;

			// update image
			image.css({
				'max-height': windowHeight,
				'max-width': windowWidth
			});

			var imageHeight = image.height();

			image.css({
				'margin-top': parseInt((windowHeight - imageHeight) / 2) + 'px'
			});

			image.fadeIn('slow');

			//update buttons
			currentIndex == 0
				? buttonPrev.hide()
				: buttonPrev.show();

			currentIndex == items.length - 1
				? buttonNext.hide()
				: buttonNext.show();

			buttonMargin = parseInt((windowHeight - buttonPrev.height()) / 2);
			buttonPrev.css({'top': buttonMargin + 'px'});
			buttonNext.css({'top': buttonMargin + 'px'});
		}

		function setImage(index) {
			if (!items[index]) {
				return;
			}
			currentIndex = index;

			var image = $('#mobile-view-img');
			image.fadeOut('fast', function() {
				image.attr('src', items[index].url);
			 });

			loadPrevImage();
			loadNextImage();
		}

		function showPrev() {
			setImage(currentIndex - 1);
			updateView();
		}

		function showNext() {
			setImage(currentIndex + 1);
			updateView();
		}

		function loadPrevImage() {
			var index = currentIndex - 1;
			if (!items[index]) {
				return;
			}
			$('#mobile-view-img-prev').attr('src', items[index].url);
		}

		function loadNextImage() {
			var index = currentIndex + 1;
			if (!items[index]) {
				return;
			}
			$('#mobile-view-img-next').attr('src', items[index].url);
		}

		function onTouchStart(e) {
			if (e.originalEvent.touches.length == 1) {
				e.stopPropagation();
				startX = e.originalEvent.touches[0].pageX;
				isMove = true;
				image.bind('touchmove', onTouchMove);
			}
		}

		function onTouchMove(e) {
			if (isMove) {
				var x = e.originalEvent.touches[0].pageX,
					dx = startX - x;

				if (Math.abs(dx) >= 21) {
					cancelTouch();
					dx > 0
						? showNext()
						: showPrev();
				}
			}
		}

		function cancelTouch() {
			image.unbind('touchmove', onTouchMove);
			startX = null;
			isMove = false;
		}

		$.imagegallery.currentImage = items[start];

		var currentIndex = start,
			view = $('<div id="mobile-view"> \
				<img id="mobile-view-img-prev" src="" alt=""> \
				<img id="mobile-view-img" src="" alt=""> \
				<img id="mobile-view-img-next" src="" alt=""> \
				<div id="mobile-view-close" class="imagegallery-mobile-view-button">х</div> \
				<div id="mobile-view-prev" class="imagegallery-mobile-view-button"><</div> \
				<div id="mobile-view-next" class="imagegallery-mobile-view-button">></div> \
			</div>'),
			buttonPrev = view.find('#mobile-view-prev'),
			buttonNext = view.find('#mobile-view-next'),
			buttonClose = view.find('#mobile-view-close'),
			image = view.find('#mobile-view-img'),
			startX,
			isMove = false;

		image.load(updateView);
		image.click(showNext);
		image.bind('touchstart', onTouchStart);

		buttonPrev.click(showPrev);
		buttonNext.click(showNext);
		buttonClose.click(close);

		$(window).bind('orientationchange', updateView);

		$('.site-frame').hide();
		$('body').addClass('imagegallery-mobile-view').append(view);
		setImage(currentIndex);

		if (settings.openImageCallback) {
			settings.openImageCallback($.imagegallery);
		}
	}

	function openDesktopView(items, start) {
		var view, tools, mainViewUl, thumbViewUl, controls, i, item, mainView, thumbView, previewControlsDiv, previewControls,
			isMobileView		= (document.documentElement.className.indexOf('mobile-view') > -1),
			dialogViewWidth		= $(window).width() * (isMobileView ? 1 : 0.8),
			imageViewMaxWidth	= dialogViewWidth - 160,
			imageViewMaxHeight	= $(window).height() - 230,
			msg					= settings.locale,
			visibleItems		= Math.min(items.length, 5),
			isMainNavigation	= items.length > 1,
			isThumbNavigation	= items.length > visibleItems;

		view = $('<div id="view"> \
			<table cellpadding="0" cellspacing="0" id="thumb"> \
				<tr> \
					<td><div id="thumb-prev"></div></td> \
					<td> \
						<div id="thumb-view"></div> \
					</td> \
					<td><div id="thumb-next"></div></td> \
				</tr> \
			</table> \
			<div id="main"> \
				<table cellpadding="0" cellspacing="0" align="center"> \
					<tr> \
						<td id="view-prev"><div id="main-prev"></div></td> \
						<td id="view-panel"> \
							<div id="view-tools"></div> \
							<div id="view-counter">' + msg.imageText + ' <span class="num">0</span> ' + msg.counterSeparatorText + ' <span class="count">0</span></div> \
							<div id="main-view"></div> \
							<div id="view-details"> \
								<div id="view-title"></div> \
								<div id="view-description"></div> \
							</div> \
							<div id="view-close" class="simplemodal-close">' + msg.closeText + '</div> \
						</td> \
						<td id="view-next"><div id="main-next"></div></td> \
					</tr> \
				</table> \
			</div> \
		</div>');

		tools = view.find('#view-tools');

		if (settings.isShowRemove) {
			tools.append(renderTool({
				id		: 'imageGalleryRemoveButton',
				cls		: 'remove-button',
				text	: msg.removeImage
			}));
		}

		if (settings.isShowFullSize) {
			tools.append(renderTool({
				id		: 'imageGalleryFullSizeButton',
				cls		: 'fullsize-button',
				text	: msg.fullSizeImage
			}));
		}

		mainViewUl			= $('<ul></ul>');
		thumbViewUl			= $('<ul></ul>');
		previewControlsDiv	= $('<div class="preview-controls"></div>');
		controls			= [];
		previewControls		= [];
		resetItemsToLoad();
		for (i = 0; i < items.length; i++) {
			item = items[i];
			addItemToLoad(i, item.url);
			var imageUrl = item.thumbUrl;
			if (i == start) {
				markItemAsLoaded(i);
				imageUrl = item.url;
			}
			mainViewUl.append(
				'<li id="view' + i + '"> \
					<table cellpadding="0" cellspacing="0"> \
						<tr><td><img id="view-image-' + i + '" src="' + imageUrl + '" alt=""/></td></tr> \
					</table> \
				</li>'
			);

			thumbViewUl.append(
				'<li class="view-control' + i + '"> \
					<div class="preview-holder"> \
						<a href="' + item.url + '" class="preview" style="background-image: url(' + item.thumbUrl + ');"><img src="' + item.thumbUrl + '" alt=""></a> \
					</div> \
				</li>'
			);

			previewControlsDiv.append('<span class="preview-control' + i + '"></span>');

			controls.push('.view-control' + i);
			previewControls.push('.preview-control' + i);
		}

		mainView	= view.find('#main-view');
		thumbView	= view.find('#thumb-view');
		mainView.append(mainViewUl);
		thumbView.append(thumbViewUl);
		view.append(previewControlsDiv);

		view.find('#view-counter .count').html(items.length);

		view.width(dialogViewWidth);
		mainView.width(dialogViewWidth);
		mainView.find('table').width(imageViewMaxWidth);
		mainView.find('td').height(imageViewMaxHeight);
		mainView.find('img').css({
			'max-height': imageViewMaxHeight,
			'max-width': imageViewMaxWidth
		});

		view.find('#main-prev, #main-next').css('margin-top', ($(window).height() / 2 - 49) + 'px');
		$('html, body').addClass('scroll');
		view.modal({
			opacity			: 80,
			zIndex			: 8000,
			overlayId		: 'overlay',
			overlayClose	: true,
			onOpen			: function(dialog) {
				dialog.overlay.show();
				dialog.container.show();
				dialog.data.show();
			},
			onClose			: function(dialog) {
				isLocked = true;
				if (settings.closeImageCallback) {
					settings.closeImageCallback($.imagegallery);
					$(document).unbind('keydown.imagegallery');
				}
				$('html, body').removeClass('scroll');
				$.modal.close();
				setTimeout(function() {isLocked = false;}, 20);
				$.imagegallery.currentImage = {};

				$(window).unbind('resize', onWindowResize);
			}
		});

		if (!isMainNavigation) {
			$('#main-next,#main-prev').addClass('disabled');
		}
		if (!isThumbNavigation) {
			$('#thumb-next,#thumb-prev').addClass('disabled');
		}
		mainView.jCarouselLite({
			btnNext		: isMainNavigation ? '#main-next' : null,
			btnPrev		: isMainNavigation ? '#main-prev' : null,
			visible		: 1,
			btnGo		: controls,
			start		: start,
			circular	: false,
			afterEnd	: function(a) {
				var num = parseInt(a.attr('id').replace('view', ''), 10);
				$.imagegallery.currentImage = items[num];
				updateDetails(num);
				selectPreview(num, true, visibleItems, items.length);
			}
		});
		thumbView.jCarouselLite({
			btnNext		: isThumbNavigation ? '#thumb-next' : null,
			btnPrev		: isThumbNavigation ? '#thumb-prev' : null,
			btnGo		: previewControls,
			visible		: visibleItems,
			circular	: false,
			afterEnd	: function(a) {
				a.each(function(i, li){
					var num = $(li).attr('class').match(/view\-control(\d+)/)[1];
					loadItem(num);
				});
			}
		});

		$.imagegallery.currentImage = items[start];
		$.imagegallery.titleContainer = $('#view-title');
		$.imagegallery.descriptionContainer = $('#view-description');

		if (settings.openImageCallback) {
			settings.openImageCallback($.imagegallery);
		}

		$(document).bind('keydown.imagegallery',function(e){
			switch(e.keyCode){
				case 37:
					$('#main-prev').click();
					e.stopPropagation();
					e.preventDefault();
					break;
				case 39:
					$('#main-next').click();
					e.stopPropagation();
					e.preventDefault();
					break;
			}
		});

		updateDetails(start);
		selectPreview(start, true, visibleItems, items.length);

		thumbView.find('a').click(function() {
			$(this).parents('li').click();
			return false;
		});

		$(window).resize(onWindowResize);
	}

	function updateDetails(num) {
		var counterContainer	= $('#view-counter .num'),
			ig 					= $.imagegallery,
			title				= (isDefaultTitle(ig.currentImage.title) ? '' : ig.currentImage.title);

		counterContainer.html(convertIndexForRtl(num) + 1);

		ig.titleContainer.html(title);
		ig.descriptionContainer.html(newLineToBr(htmlEncode(ig.currentImage.description)));
		settings.changeImageCallback(ig);
	}

	function renderTool(config) {
		var tool = $(
			'<table id="' + config.id + '" cellpadding="0" cellspacing="0" class="button ' + config.cls + '"> \
				<tr> \
					<td class="l"></td> \
					<td class="m"><i>&nbsp;</i>' + config.text + '</td> \
					<td class="r"></td> \
				</tr> \
			</table>'
		);

		tool.hover(
			function () { $(this).addClass('button-hover'); },
			function () { $(this).removeClass('button-hover'); }
		).mousedown(
			function () { $(this).addClass('button-active'); }
		).mouseup(
			function () { $(this).removeClass('button-active'); }
		);

		if (config.handler) {
			tool.bind('click', function(event) {
				event.stopPropagation();
				event.preventDefault();
				config.handler();
			});
		}

		return tool;
	}

	function selectPreview(index, move, visible, total) {
		$('#thumb-view li').removeClass('active');
		if (move) {
			var shift = Math.floor(visible / 2),
				moveTo = Math.max((index - shift), 0);

			if ((total - index + 1) < visible) {
				moveTo = total - visible;
			}
			$('.preview-control' + moveTo).click();
		}
		$('.view-control' + index).addClass('active').click();
	}

	function requestPicasaAlbum(store) {
		var	params	= 'fields=entry(gphoto:id,content,title,summary)&kind=photo&v=2.0&alt=json',
			tmp		= store.albumUrl.split('?').concat(params),
			url		= tmp.shift().concat('?').concat(tmp.join('&'));
		$.getJSON(url, 'callback=?', onResponsePicasaAlbum);
	}

	function onResponsePicasaAlbum(response) {
		var album = parsePicasaAlbum(response.feed);
		if (album) {
			settings.store.data = album.items;
			setCurrentPage(settings.store.currentPage, true);
		}
	}

	function parsePicasaAlbum(data) {
		if (!data.entry) {
			return false;
		}
		var album	= {
				title		: data.title === undefined				? '' : data.title.$t,
				description	: data.subtitle === undefined			? '' : data.subtitle.$t,
				location	: data.gphoto$location === undefined	? '' : data.gphoto$location.$t,
				date		: data.gphoto$timestamp === undefined	? '' : data.gphoto$timestamp.$t,
				items		: []
			},
			entry	= data.entry,
			iMax	= entry.length;

		for (var i = 0; i < iMax; i++) {
			var image = entry[i];
			album.items.push({
				id			: image.gphoto$id.$t,
				url			: image.content.src,
				thumbUrl	: image.content.src + '?imgmax=150',
				title		: image.title ? image.title.$t : '',
				description	: image.summary ? image.summary.$t : ''
			});
		}

		return album;
	}

	function onWindowResize() {
		if (!$.imagegallery.currentImage.id) {
			return;
		}
		var items = filter(settings.store.data);
		var index = 0;
		$.each(items, function(key, item) {
			if (item.id == $.imagegallery.currentImage.id) {
				index = key;
				return false;
			}
		});
		$.modal.close();
		setTimeout(function() {
			openView(items, index)
		}, 200);
	}

	function createPaging(store) {
		var currentPage = parseInt(store.currentPage),
			maxPage = Math.ceil(store.data.length / settings.pageSize);

		if (maxPage < 2) {
			return '';
		}

		var pagination = $('<table></table>').addClass('pagination'),
			locale = settings.locale,
			prevText = '&laquo; ' + locale.prevText,
			nextText = locale.nextText + ' &raquo;',
			paginationPrev = $('<td></td>').addClass('pagination-prev'),
			paginationNext = $('<td></td>').addClass('pagination-next'),
			paginationPages = [];

		if (currentPage > 1) {
			paginationPrev.append(getPagingLink(currentPage - 1, prevText, previousPageHandler));
			paginationPages.push(getPagingLink(1, 1, changePageHandler));
		} else {
			paginationPrev.append(prevText);
		}

		if ((currentPage - 2) > 1) {
			paginationPages.push('...');
		}
		if ((currentPage - 1) > 1) {
			paginationPages.push(getPagingLink(currentPage - 1, currentPage - 1, changePageHandler));
		}

		paginationPages.push('<strong>' + currentPage + '</strong>');

		if ((currentPage + 1) < maxPage) {
			paginationPages.push(getPagingLink(currentPage + 1, currentPage + 1, changePageHandler));
		}
		if ((currentPage + 2) < maxPage) {
			paginationPages.push('...');
		}

		if (currentPage < maxPage) {
			paginationPages.push(getPagingLink(maxPage, maxPage, changePageHandler));
			paginationNext.append(getPagingLink(currentPage + 1, nextText, nextPageHandler));
		} else {
			paginationNext.append(nextText);
		}

		pagination.append(paginationPrev);
		$.each(paginationPages, function(i, page) {
			pagination.append($('<td></td>').append(page));
		});
		pagination.append(paginationNext);

		return pagination;
	}

	function getPagingLink(page, text, handler) {
		var parentId = el.parent().attr('id');

		return $('<a href="#"></a>')
			.attr('href', updateHashParamsString(parentId, page))
			.html(text)
			.click([page], handler)
	}

	function setCurrentPage(page, updateHash) {
		var store = settings.store,
			total = store.data.length,
			pageSize = settings.pageSize,
			pages = total < pageSize ? 1 : Math.ceil(total / pageSize);

		if (page > 0) {
			page = page > pages ? pages : page;
		}
		if (page < 0) {
			if (Math.abs(page) > pages) {
				page = 1;
			} else {
				page = page + pages + 1;
			}
		}
		if (page == 0) {
			page = 1;
		}

		store.currentPage = page;
		if (updateHash && settings.isChangeHashParams) {
			if (page != 1) {
				window.location.hash = updateHashParamsString(el.parent().attr('id'), 'page' + page);
			} else {
				window.location.hash = removeHashParamsString(el.parent().attr('id'));
			}
		}
		render(store);
		settings.changePageCallback();
	}

	function nextPageHandler() {
		setCurrentPage(parseInt(settings.store.currentPage) + 1, true);
		return false;
	}

	function previousPageHandler() {
		setCurrentPage(parseInt(settings.store.currentPage) - 1, true);
		return false;
	}

	function changePageHandler(event) {
		var page = event.data[0];
		setCurrentPage(page, true);
		return false;
	}

	function parseHashParams() {
		var hash = window.location.hash.replace(/^#(.*)/, "$1"),
			result = {};

		if (hash.length) {
			var vars = hash.split('&');
			$(vars).each(function(i) {
				var param = vars[i].split('=');
				if (param.length == 2) {
					result[param[0]] = param[1];
				}
			});
		}

		return result;
	}

	function updateHashParamsString(name, value) {
		var result = '',
			params = parseHashParams();

		params[name] = value;

		for (var i in params) {
			result += '&' + i + '=' + params[i];
		}

		if (result.length) {
			result = result.replace(/^&(.*)/, "#$1");
		}

		return result;
	}

	function removeHashParamsString(name) {
		var result = '',
			params = parseHashParams();

		for (var i in params) {
			if (i != name) {
				result += '&' + i + '=' + params[i];
			}
		}

		if (result.length) {
			result = result.replace(/^&(.*)/, "#$1");
		}

		return result;
	}

	function getPageNumberFromUrl(idGallery) {
		var params = parseHashParams();

		if (params[idGallery]) {
			var pageReg = /page(\d+)/i;
				matches = params[idGallery].match(pageReg);

			if (matches && matches.length > 1) {
				return matches[1];
			}
		}

		return false;
	}

	function convertIndexForRtl(index) {
		if (settings.isRtl) {
			return settings.store.data.length - index - 1;
		}
		return index;
	}
};

$.fn.imagegallery.defaults = {
	thumbSize: 'normal',
	pageSize: 25,
	align: 'left',
	isShowRemove: false,
	isShowFullSize: false,
	isChangeHashParams: true,
	isRtl: false,
	beforeOpenImageCallback: function(gallery){},
	openImageCallback: function(gallery){},
	closeImageCallback: function(gallery){},
	changeImageCallback: function(gallery){},
	changePageCallback: function() {},
	store: {
		type: 'array',
		data: [],
		currentPage: 1,
		deletedImages: []
	},
	locale: {
		imageText: 'Image',
		counterSeparatorText: ' of ',
		prevText: 'Previous',
		nextText: 'Next',
		closeText: 'Close',
		removeImage: 'Remove image',
		fullSizeImage: 'See full size image',
		defaultTitle: 'Name'
	}
};

})(jQuery);