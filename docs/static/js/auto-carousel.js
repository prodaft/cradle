document.addEventListener('DOMContentLoaded', function() {
  const carousels = document.querySelectorAll('.auto-carousel');
  carousels.forEach(function(carousel) {
    const ele = carousel.querySelector('ul');
    const bullets = carousel.querySelectorAll('ol li');
    const slides = Array.from(carousel.querySelectorAll('ul li'));
    const slideCount = slides.length;
    const nextarrow = carousel.querySelector('.next');
    const prevarrow = carousel.querySelector('.prev');
    let isDown = false;
    let startX;
    let scrollLeft;
    let isWrapping = false;

    if (slideCount > 1) {
      const clone = slides[0].cloneNode(true);
      clone.classList.add('carousel-clone');
      ele.appendChild(clone);
    }

    const amountvisible = Math.round(ele.offsetWidth / ele.querySelector('li:nth-child(1)').offsetWidth);
    const allSlides = carousel.querySelectorAll('ul li');

    nextarrow.style.display = 'block';
    prevarrow.style.display = 'block';
    ele.scrollLeft = 0;
    bullets[0].classList.add('selected');
    allSlides[0].classList.add('selected');
    if (amountvisible > 1) {
      var removeels = carousel.querySelectorAll('ol li:nth-last-child(-n + ' + (amountvisible - 1) + ')');
      removeels.forEach(function(removeel) {
        removeel.remove();
      });
    }

    const resetToStart = function() {
      const previousBehavior = ele.style.scrollBehavior;
      ele.style.scrollBehavior = 'auto';
      ele.scrollLeft = 0;
      ele.offsetHeight;
      ele.style.scrollBehavior = previousBehavior;
      isWrapping = false;
    };

    const setSelected = function() {
      if (isWrapping) return;
      bullets.forEach(function(bullet) {
        bullet.classList.remove('selected');
      });
      allSlides.forEach(function(slide) {
        slide.classList.remove('selected');
      });
      const scrolllength = carousel.querySelector('ul li:nth-child(2)').offsetLeft - carousel.querySelector('ul li:nth-child(1)').offsetLeft;
      if (!scrolllength) return;
      if (ele.scrollLeft >= (scrolllength * slideCount) - 1) {
        isWrapping = true;
        requestAnimationFrame(resetToStart);
        return;
      }
      let nthchild = Math.round((ele.scrollLeft / scrolllength) + 1);
      carousel.querySelector('ol li:nth-child(' + nthchild + ')').classList.add('selected');
      carousel.querySelector('ul li:nth-child(' + nthchild + ')').classList.add('selected');
      if (carousel.parentElement.parentElement.querySelector('.dynamictitle')) {
        const title = carousel.querySelector('ul li:nth-child(' + nthchild + ') img').getAttribute('title');
        if (title) carousel.parentElement.parentElement.querySelector('.dynamictitle').innerHTML = title;
      }
    };

    const scrollTo = function(event) {
      event.preventDefault();
      ele.scrollLeft = ele.querySelector(this.getAttribute('href')).offsetLeft;
    };

    const nextSlide = function() {
      if (!carousel.querySelector('ol li:last-child').classList.contains('selected')) {
        carousel.querySelector('ol li.selected').nextElementSibling.querySelector('a').click();
      } else if (slideCount > 1) {
        const scrolllength = carousel.querySelector('ul li:nth-child(2)').offsetLeft - carousel.querySelector('ul li:nth-child(1)').offsetLeft;
        if (!scrolllength) return;
        isWrapping = true;
        ele.style.scrollBehavior = 'smooth';
        ele.scrollLeft = scrolllength * slideCount;
        setTimeout(resetToStart, 280);
      }
    };

    const prevSlide = function() {
      if (!carousel.querySelector('ol li:first-child').classList.contains('selected')) {
        carousel.querySelector('ol li.selected').previousElementSibling.querySelector('a').click();
      } else {
        carousel.querySelector('ol li:last-child a').click();
      }
    };

    const setInteracted = function() {
      ele.classList.add('interacted');
    };

    ele.addEventListener('scroll', debounce(setSelected));
    ele.addEventListener('touchstart', setInteracted);
    ele.addEventListener('keydown', function(e) {
      if (e.key == 'ArrowLeft') ele.classList.add('interacted');
      if (e.key == 'ArrowRight') ele.classList.add('interacted');
    });
    ele.addEventListener('mousedown', (e) => {
      isDown = true;
      ele.classList.add('grabbing');
      startX = e.pageX - ele.offsetLeft;
      scrollLeft = ele.scrollLeft;
      ele.classList.add('interacted');
    });
    ele.addEventListener('mouseleave', () => {
      isDown = false;
      ele.classList.remove('grabbing');
      ele.scrollLeft = ele.scrollLeft - 1;
      ele.scrollLeft = ele.scrollLeft + 1;
    });
    ele.addEventListener('mouseup', () => {
      isDown = false;
      ele.classList.remove('grabbing');
      ele.scrollLeft = ele.scrollLeft - 1;
      ele.scrollLeft = ele.scrollLeft + 1;
    });
    ele.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - ele.offsetLeft;
      const walk = (x - startX) * 3;
      ele.scrollLeft = scrollLeft - walk;
    });

    nextarrow.addEventListener('click', nextSlide);
    nextarrow.addEventListener('mousedown', setInteracted);
    nextarrow.addEventListener('touchstart', setInteracted);

    prevarrow.addEventListener('click', prevSlide);
    prevarrow.addEventListener('mousedown', setInteracted);
    prevarrow.addEventListener('touchstart', setInteracted);

    bullets.forEach(function(bullet) {
      bullet.querySelector('a').addEventListener('click', scrollTo);
      bullet.addEventListener('mousedown', setInteracted);
      bullet.addEventListener('touchstart', setInteracted);
    });

    if (carousel.getAttribute('duration')) {
      setInterval(function() {
        if (ele != document.querySelector('.auto-carousel:hover ul') && ele.classList.contains('interacted') == false) {
          nextarrow.click();
        }
      }, carousel.getAttribute('duration'));
    }
  });
});

function debounce(fn) {
  let timeout;
  return function() {
    let context = this;
    let args = arguments;
    if (timeout) {
      window.cancelAnimationFrame(timeout);
    }
    timeout = window.requestAnimationFrame(function() {
      fn.apply(context, args);
    });
  };
}
