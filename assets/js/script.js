//****************************************
// Website scripts
//****************************************
'use strict';

const handleSearch = () => {
  // events
  const searchOpen = document.querySelector('.js-search-open');
  const searchClose = document.querySelector('.js-search-close');
  const searchForm = document.querySelector('.js-search-form');
  const searchField = document.querySelector('#ghost-search-field');
  const searchByTags = document.querySelectorAll('.js-search-tag');
  let fuseSearch;

  if (!CONFIG.GHOST_URL || !CONFIG.GHOST_KEY) {
    searchOpen.classList.add('is-hidden');
    return;
  }

  if (searchOpen && searchClose) {
    searchOpen.onclick = () => {
      prepareSearch();
      addClass('.js-search', 'is-active');
      document.body.classList.add('is-overflowY-hidden');
      searchField.focus();
    };

    searchClose.onclick = () => {
      removeClass('.js-search', 'is-active');
      const menuStatus = document.querySelector('.js-menu').classList.contains('is-active') ? 'open' : 'close';
      if (menuStatus === 'close') document.body.classList.remove('is-overflowY-hidden');
    };
  }

  if ( searchField && searchForm ) {
    searchField.onfocus = () => {
      addClass('.search__form', 'focused');
    };

    searchField.onkeyup = (e) => {
      e.preventDefault();
      if (e.target.value.length > 2) {
        performSearch(e.target.value);
        document.querySelector('.js-search-info').classList.add('is-hidden');
        document.querySelector('.js-search-number').classList.remove('is-hidden');
        document.querySelector('.js-search-notify').classList.remove('is-hidden');
      } else {
        document.querySelector('.js-search-info').classList.remove('is-hidden');
        document.querySelector('.js-search-number').classList.add('is-hidden');
        document.querySelector('.js-search-notify').classList.add('is-hidden');
        document.querySelector('.js-search-results').innerHTML = '';
      }
    };
  
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
    }, false);
  
    searchField.onblur = () => {
      removeClass('.search__form', 'focused');
    };
  }

  if ( searchByTags ) {
    searchByTags.forEach((el) => {
      el.onclick = (evt) => {
        searchField.value = evt.srcElement.innerText;
        searchField.dispatchEvent(new Event('keyup'));
      }
    });
  }
}

const prepareSearch = () => {
  if (GLOBAL.FUSE) return;

  const getPosts = async function(filter, callback) {
    const api = new GhostContentAPI({
      url: CONFIG.GHOST_URL,
      key: CONFIG.GHOST_KEY,
      version: CONFIG.GHOST_VERSION
    });

    const fields = CONFIG.GHOST_SEARCH_IN_CONTENT ? `url,slug,title,published_at,custom_excerpt,visibility,plaintext`
                                                  : `url,slug,title,published_at,custom_excerpt,visibility`

    const formats = CONFIG.GHOST_SEARCH_IN_CONTENT ? ['html,plaintext'] : ''
  
    // fetch posts, including related tags and authors
    try {
      const res = await api.posts
      .browse({
        limit: 'all',
        include: 'tags',
        fields: fields,
        filter: filter,
        formats: formats
      });
      return res;
    } catch (err) {
      console.log(err);
    }
  }

  getPosts()
  .then(function(posts){
    const keys = CONFIG.GHOST_SEARCH_IN_CONTENT ? [{name: 'title'}, {name: 'tags.name'}, {name: 'custom_excerpt'}, {name: 'plaintext'}]
                                                : [{name: 'title'}, {name: 'tags.name'}, {name: 'custom_excerpt'}];

    /* Custom settings for search function */
    const options = {
      // includeMatches: true,
      shouldSort: true,
      tokenize: true,
      matchAllTokens: true,
      threshold: 0,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 3,
      ignoreLocation: true,
      keys: keys
    }

    GLOBAL.FUSE = new Fuse(posts, options);   
  });
}

/** 
* Handle Ghost Search
*/ 
const performSearch = (query) => {
  const results = GLOBAL.FUSE.search(query, {limit: CONFIG.GHOST_SEARCH_LIMIT});
  const resultEl = document.querySelector('.js-search-results');
  document.querySelector('.js-search-number').innerText = results.length;

  if (results.length === 0) {
    resultEl.innerHTML = '';
    return;
  }

  const posts = results.map(function(post) { 
    const indexTitle = post.item.title.search(new RegExp(query,'i'));

    // Highlight search in title
    const title = indexTitle > -1 ? `${post.item.title.substring(0, indexTitle)}<span class="highlight">${post.item.title.substring(indexTitle, indexTitle + query.length)}</span>${post.item.title.substring(indexTitle + query.length, post.item.title.length)}`
                                  : post.item.title

    let start = 0, end = 100;
    let excerpt;

    // Highlight search in content
    if (CONFIG.GHOST_SEARCH_IN_CONTENT) {
      const indexContent = post.item.plaintext.search(new RegExp(query,'i'));

      if ( indexContent > 50 ) {
        start = indexContent - 50;
        end = indexContent + 50;
      }

      excerpt = post.item.plaintext.substring(start, end);

      excerpt = indexContent > -1 ? `...${post.item.plaintext.substring(start, indexContent)}<span class="highlight">${post.item.plaintext.substring(indexContent, indexContent + query.length)}</span>${post.item.plaintext.substring(indexContent + query.length, end)}...`
                                        : excerpt;
    } else {
      excerpt = post.item.custom_excerpt ? post.item.custom_excerpt.substring(start, end) : ''
    }

    return  `<a href='${post.item.url}' class='search-result__post border'>
              <div class='search-result__content'>
                <h5 class='search-result__title'>${title}</h5>
                <p class='search-result__excerpt'>${excerpt}</p>
              </div>
            </a>`;
  }).join(' ');

  resultEl.innerHTML = posts;
}

/** 
* Handle Load More
*/
const handleLoadMore = () => {
  // init
  const loadMoreBtn = document.querySelector('.js-load-more');

  if (loadMoreBtn && GLOBAL.LAST_PAGE) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.classList.add('btn--disabled');
  }

  // event
  if (loadMoreBtn) {
    loadMoreBtn.onclick = (event) => {
      loadMorePosts(event.srcElement);
    }
  }
}

/** 
* Handle Image Gallery
*/
const handleImageGallery = () => {
  const images = document.querySelectorAll('.kg-image-card img, .kg-gallery-card img');
  const galleryImages = document.querySelectorAll('.kg-gallery-image img');

  // Gallery style
  galleryImages.forEach(image => {
    var container = image.closest('.kg-gallery-image');
    var width = image.attributes.width.value;
    var height = image.attributes.height.value;
    var ratio = width / height;
    container.style.flex = `${ratio} 1 0%`;
  })

  // Lighbox function
  if (CONFIG.ENABLE_IMAGE_LIGHTBOX) {
    images.forEach(image => {
      const link = image.parentNode.nodeName === 'A' ? image.parentNode.getAttribute('href') : '';
      var lightboxWrapper = link ? image.parentNode : document.createElement('a');

      lightboxWrapper.setAttribute('data-no-swup', '');
      lightboxWrapper.setAttribute('data-fslightbox', '');
      lightboxWrapper.setAttribute('href', image.src);
      lightboxWrapper.setAttribute('aria-label', 'Click for Lightbox');

      if (link) {
        var linkButton = document.createElement('a');
        linkButton.innerHTML = `<i class="icon icon-link icon--sm"><svg class="icon__svg"><use xlink:href="/assets/icons/icon-sprite.svg#link"></use></svg></i>`
        linkButton.setAttribute('class', 'image-link');
        linkButton.setAttribute('href', link);
        if (CONFIG.OPEN_LINKS_IN_NEW_TAB) {
          linkButton.setAttribute('target', '_blank');
          linkButton.setAttribute('rel', 'noreferrer noopener');
        }
        lightboxWrapper.parentNode.insertBefore(linkButton, lightboxWrapper.parentNode.firstChild);
      } else {
        image.parentNode.insertBefore(lightboxWrapper, image.parentNode.firstChild);
        lightboxWrapper.appendChild(image);
      }
    });

    refreshFsLightbox();
  };
}

/** 
* Handle Menu
*/
const handleMenu = () => {
  // menu
  const menuToggleBtn = document.querySelector('.js-menu-toggle');
  const menu = document.querySelector('.js-menu');
  if (menuToggleBtn && menu) {
    menuToggleBtn.onclick = (event) => {
      const menuStatus = event.currentTarget.classList.contains('is-active') ? 'open' : 'close';
      if (menuStatus === 'open') {
        event.currentTarget.classList.remove('is-active');
        menu.classList.remove('is-active');
        document.body.classList.remove('is-overflowY-hidden');
      } else {
        event.currentTarget.classList.add('is-active');
        menu.classList.add('is-active');
        document.body.classList.add('is-overflowY-hidden');
      }
    }
  }
}

/** 
* Handle Dropdown Menu
*/
const handleDropdownMenu = () => {
  const dropdownBtn = document.querySelector('.js-dropdown-menu-toggle');
  let isDropdownFocus = false;
  if (dropdownBtn) {
    dropdownBtn.onfocus = (event) => {
      isDropdownFocus=true;
      event.currentTarget.nextElementSibling.classList.add('is-active');
    }

    dropdownBtn.onblur = (event) => {
      event.currentTarget.nextElementSibling.classList.remove('is-active');
    }

    dropdownBtn.onclick = (event) => {
      !isDropdownFocus ? event.currentTarget.nextElementSibling.classList.toggle('is-active')
                     : isDropdownFocus = false;
    }
  }
}

/** 
* Handle Theme Toggle
*/
const handleThemeToggle = () => {
  // theme
  const themeToggleBtn = document.querySelectorAll('.js-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.forEach(btn => {
      btn.onclick = (event) => {
        toggleTheme();
      }
    });
  }
}

/** 
* Handle User Menu
*/
const handleUserMenu = () => {
  const memberBtn = document.querySelector('.js-member-btn');
  let isMemberFocus = false;
  if (memberBtn) {
    memberBtn.onfocus = (event) => {
      isMemberFocus=true;
      event.currentTarget.nextElementSibling.classList.add('is-active');
    }

    memberBtn.onblur = (event) => {
      event.currentTarget.nextElementSibling.classList.remove('is-active');
    }

    memberBtn.onclick = (event) => {
      !isMemberFocus ? event.currentTarget.nextElementSibling.classList.toggle('is-active')
                     : isMemberFocus = false;
    }
  }
}

/** 
* Handle Scroll Top
*/
const handleScrollTop = () => {
  const scrollTopBtn = document.querySelector('.js-scroll-top');
  if (scrollTopBtn) {
    scrollTopBtn.onclick = () => {
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  }
}

/** 
* Handle Floating Header
*/
const handleFloatingHeader = () => {

  const header = document.querySelector('.js-header');

  if (header && CONFIG.ENABLE_FLOATING_HEADER) {
    var options = {
      offset : 100,
      tolerance : 0,
      classes : {
        initial : "is-floating",
        pinned : "is-pinned",
        unpinned : "is-unpinned",
        top : "is-top",
        notTop : "is-not-top",
        bottom : "is-bottom",
        notBottom : "is-not-bottom",
        frozen: "is-frozen",
      }
    };

    const headroom = new Headroom(header, options);
    headroom.init();
  }
}

/** 
* Handle Notifications
*/
const handleNotifications = () => {
  const notifyCloseBtns = document.querySelectorAll('.js-notify-close');
  notifyCloseBtns.forEach(closeBtn => {
    closeBtn.onclick = (event) => {
      const toRemove = event.currentTarget.getAttribute('data-class');
      if (toRemove) {
        document.body.classList.remove(toRemove);
        clearURI();
      } else {
        event.currentTarget.closest('form').classList.remove('success', 'error');
      }
    }
  });
}

/** 
* Handle Slider
*/
const handleSlider = () => {
  const sliderContainer = document.querySelector('.js-featured-feed');

  if (sliderContainer) {
    const slider = tns({
      container: sliderContainer,
      items: 1,
      slideBy: 1,
      loop: true,
      autoplay: false,
      gutter: 0,
      nav: false,
      controls: true,
      prevButton: document.querySelector('.js-featured-prev'),
      nextButton: document.querySelector('.js-featured-next'),
      // responsive: {
      //   0: {
      //     items: 1,
      //   },
      //   768: {
      //     items: 2,
      //   },
      //   992: {
      //     items: 3,
      //   }
      // }
    });
  }
}

/** 
* Handle External links
*/
const handleExternalLinks = () => {
  if (CONFIG.OPEN_LINKS_IN_NEW_TAB) {
    const domain = location.host.replace('www.', '');
    const postLinks = document.querySelectorAll('.content a');
  
    postLinks.forEach((link) => {
      if(!link.href.includes(domain)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noreferrer noopener');
      }
    })
  }
}

/**
* Handle Keyboard events
*/
const handleKeyboardEvents = () => {
  // Key press event handling
  window.onkeydown = (evt) => {
    const sourceClass = evt.srcElement.className;

    switch(evt.key) {
      case 'Escape':
        removeClass('.js-menu', 'is-active');
        removeClass('.js-menu-toggle', 'is-active');
        removeClass('.js-search', 'is-active');
        document.body.classList.remove('is-overflowY-hidden');
        // document.body.style.overflowY = 'auto'; 
        break;
      default:
        break;// nothing to do
    }
  }
}

/**
* Handle Keyboard events
*/
const handleProgressBar = () => {
  const progressBar = document.querySelector('.progress-bar');

  if (progressBar) {
    window.addEventListener('scroll', (event) => {
      // Progressbar
      var scrollTop = document.querySelector('.post')["scrollTop"] ||
                      document.documentElement["scrollTop"] || 
                      document.body["scrollTop"];
  
      var scrollBottom = ( document.querySelector('.post')["scrollHeight"] ||
                          document.documentElement["scrollHeight"] ||
                          document.body["scrollHeight"] -
                          document.documentElement.scrollHeight);
  
      scrollPercent = Math.round(scrollTop / scrollBottom * 100) + "%";
      progressBar.style.setProperty("--scroll", scrollPercent);
    }, false);
  }
}

/**
* Handle Intro Overlay
*/
const handleIntroOverlay = () => {
  const intro = document.querySelector('.js-intro');
  const userIntroPreference = localStorage.getItem('USER_INTRO');

  if(intro && !userIntroPreference) {
    document.body.classList.add('is-overflowY-hidden');
  }

  const introClose = document.querySelector('.js-intro-close');
  if (intro && introClose) {
    introClose.onclick = () => {
      _handleIntro();
    }
  }

  const introPost = document.querySelector('.js-intro-post');
  if (intro && introPost) {
    introPost.onclick = () => {
      _handleIntro();
    }
  }

  const introArchive = document.querySelector('.js-intro-archive');
  if (intro && introArchive) {
    introArchive.onclick = () => {
      _handleIntro();
    }
  }

  const _handleIntro = () => {
    document.documentElement.setAttribute('data-intro', 'hidden');
    localStorage.setItem('USER_INTRO', 'hidden');
    document.body.classList.remove('is-overflowY-hidden');
  }
}

/**
* Handle Announcement
*/
const handleAnnouncement = () => {
  const announce = document.querySelector('.js-announce');

  if (announce) {
    const announceHeight = announce.offsetHeight;
    document.documentElement.style.setProperty('--global-announcement-height', `${announceHeight}px`);
  } 
}

/** 
* Toggle Scheme
* @param
*/ 
const toggleTheme = () => {
  const currentTheme =  document.documentElement.getAttribute('data-color-scheme');
  currentTheme === 'light' ? setTheme('dark') : setTheme('light');
}

/** 
* Set Theme
* @param: sTheme
*/ 
const setTheme = (sTheme) => {
  document.documentElement.setAttribute('data-color-scheme', sTheme);
  localStorage.setItem('USER_COLOR_SCHEME', sTheme);
}

/** 
* Toggle Class
* @param: el_class
* @param: target_class
*/ 
const toggleClass = (el_class, target_class) => {
  const el = document.querySelector(el_class);
  if (el) el.classList.toggle(target_class);
}

/** 
* Add Class
* @param: el_class
* @param: target_class
*/ 
const addClass = (el_class, target_class) => {
  const el = document.querySelector(el_class);
  if (el) el.classList.add(target_class);
}

/** 
* Remove Class
* @param: el_class
* @param: target_class
*/ 
const removeClass = (el_class, target_class) => {
  const el = document.querySelector(el_class);
  if (el) el.classList.remove(target_class);
}

/** 
* Check if element in Viewport
* @param: el
*/ 
const isInViewport = (el) => {
  let top = el.offsetTop;
  let left = el.offsetLeft;
  let width = el.offsetWidth;
  let height = el.offsetHeight;

  while(el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return(
    top < (window.pageYOffset + window.innerHeight) &&
    left < (window.pageXOffset + window.innerWidth) &&
    (top + height) > window.pageYOffset &&
    (left + width) > window.pageXOffset
  );
}

/** 
* Load more posts
* @param: button
*/ 
const loadMorePosts = (button) => {
  // next link
  const nextPage = document.querySelector('link[rel=next]');
  GLOBAL.NEXT_PAGE_LINK = nextPage && !GLOBAL.NEXT_PAGE_LINK ? nextPage.getAttribute('href') : GLOBAL.NEXT_PAGE_LINK;

  // Update current page value
  if (GLOBAL.NEXT_PAGE_LINK && !GLOBAL.LAST_PAGE) {
    button ? button.classList.add('is-loading') : '';

    // Fetch next page content
    fetch(GLOBAL.NEXT_PAGE_LINK).then(res => res.text())
    .then(text => new DOMParser().parseFromString(text, 'text/html'))
    .then(doc => {
      // Get posts
      const posts = doc.querySelectorAll('.js-post-card');
      const postContainer = document.querySelector('.js-post-feed');
      const nextPage = doc.querySelector('link[rel=next]');

      // Add each post to the page
      posts.forEach(post => {
        postContainer.appendChild(post);
      });

      // Update GLOBALS
      GLOBAL.CURRENT_PAGE = GLOBAL.CURRENT_PAGE + 1;
      GLOBAL.NEXT_PAGE_LINK =  nextPage ? nextPage.getAttribute('href') : '';
      GLOBAL.NEXT_PAGE = GLOBAL.NEXT_PAGE_LINK ? GLOBAL.NEXT_PAGE + 1 : NaN;
      GLOBAL.LAST_PAGE = GLOBAL.CURRENT_PAGE === GLOBAL.MAX_PAGES ? true : false;

      // Disable button on last page
      if (button && GLOBAL.LAST_PAGE) {
        button.disabled = true;
        button.classList.add('btn--disabled');
      }

      button ? button.classList.remove('is-loading') : '';
    }).catch(function (err) {
      // There was an error
      console.warn('Something went wrong.', err);
    });
  }
}

/** 
* DOM Loaded event
*/ 
const callback = () => {
  fitvids();
  handleSearch();
  handleLoadMore();
  handleImageGallery();
  handleMenu();
  handleDropdownMenu();
  handleUserMenu();
  handleThemeToggle();
  handleFloatingHeader();
  handleScrollTop();
  handleNotifications();
  handleSlider();
  handleExternalLinks();
  handleKeyboardEvents();
  handleProgressBar();
  handleIntroOverlay();
  handleAnnouncement();
};

if (
    document.readyState === 'complete' ||
    (document.readyState !== 'loading' && !document.documentElement.doScroll)
) {
  callback();
} else {
  document.addEventListener('DOMContentLoaded', callback);
}