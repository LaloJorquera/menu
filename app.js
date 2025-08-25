 
    const feed = document.getElementById('feed');
    const drawer = document.getElementById('drawer');
    const commentsList = document.getElementById('commentsList');
    const commentInput = document.getElementById('commentInput');
    const sendComment = document.getElementById('sendComment');
    const uploader = document.getElementById('uploader');

    // Demo data (reemplaza con tus fuentes)
    const DEMO = [
      {
        src: 'https://videos.pexels.com/video-files/855993/855993-hd_1920_1080_24fps.mp4',
        poster: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260',
        user: '@skater',
        caption: 'Kickflip en el parque #skate #fun',
        track: 'beat – lo-fi session',
        likes: 245,
        comments: [
          {user: '@ana', text: 'Brutal 🔥'},
          {user: '@martin', text: 'Ese spot es mítico'}
        ]
      },
      {
        src: 'https://videos.pexels.com/video-files/2887465/2887465-uhd_2560_1440_25fps.mp4',
        poster: 'https://images.pexels.com/photos/2880507/pexels-photo-2880507.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260',
        user: '@chef',
        caption: 'Pasta cremosa en 60 segundos 🍝',
        track: 'midnight kitchen',
        likes: 872,
        comments: [
          {user: '@sol', text: 'Pasaste la receta? 🙏'},
          {user: '@leo', text: 'Se ve increíble'}
        ]
      },
      {
        src: 'https://videos.pexels.com/video-files/856657/856657-hd_1920_1080_24fps.mp4',
        poster: 'https://images.pexels.com/photos/995301/pexels-photo-995301.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260',
        user: '@hiker',
        caption: 'Amanecer en la cumbre ⛰️',
        track: 'ambient sunrise',
        likes: 1540,
        comments: [
          {user: '@maria', text: 'Qué vista!'},
          {user: '@andres', text: 'Me motivé a salir'}
        ]
      }
    ];

    // Build cards
    function createCard(item){
      const tpl = document.getElementById('cardTemplate');
      const node = tpl.content.cloneNode(true);
      const card = node.querySelector('.card');
      const video = node.querySelector('video');
      const likeBtn = node.querySelector('.btn.like');
      const likeCount = node.querySelector('.count.likes');
      const commentBtn = node.querySelector('.btn.comment');
      const commentsCount = node.querySelector('.count.comments');
      const shareBtn = node.querySelector('.btn.share');
      const caption = node.querySelector('.caption');
      const user = node.querySelector('.name');
      const avatar = node.querySelector('.avatar');
      const marquee = node.querySelector('.marquee span');
      const dblLike = node.querySelector('.dbl-like');
      const progress = node.querySelector('.progress .bar');
      const muteBtn = node.querySelector('.mute');

      video.src = item.src;
      if(item.poster) video.poster = item.poster;
      user.textContent = item.user;
      caption.textContent = item.caption;
      marquee.textContent = ` ♫ ${item.track} \u00A0\u00A0\u00A0\u00A0`;
      likeCount.textContent = formatCount(item.likes || 0);
      commentsCount.textContent = formatCount(item.comments?.length || 0);
      avatar.style.backgroundImage = `url('https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(item.user)}')`;
      avatar.style.backgroundSize = 'cover';

      // Click to pause/play
      card.addEventListener('click', (e)=>{
        // ignore clicks on UI buttons
        if(e.target.closest('.btn') || e.target.closest('.follow') || e.target.closest('.mute')) return;
        if(video.paused){ video.play().catch(()=>{}); } else { video.pause(); }
      });

      // Double tap like
      let lastTap = 0;
      card.addEventListener('pointerdown', (e)=>{
        const now = Date.now();
        if(now - lastTap < 260){
          likeBtn.classList.add('active');
          animateHeart(dblLike);
          bumpCount(likeCount, 1);
        }
        lastTap = now;
      });

      // Like toggle
      likeBtn.addEventListener('click', ()=>{
        const active = likeBtn.classList.toggle('active');
        bumpCount(likeCount, active ? 1 : -1);
      });

      // Comments
      commentBtn.addEventListener('click', ()=>{
        openComments(item);
      });

      // Share (copy link)
      shareBtn.addEventListener('click', async ()=>{
        try{
          await navigator.clipboard.writeText(location.href);
          shareBtn.querySelector('.count.shares').textContent = 'Copiado';
          setTimeout(()=>shareBtn.querySelector('.count.shares').textContent='Compartir', 1200);
        }catch{ alert('Link copiado'); }
      });

      // Progress
      video.addEventListener('timeupdate', ()=>{
        const pct = (video.currentTime / (video.duration||1)) * 100;
        progress.style.width = pct + '%';
      });

      // Mute
      muteBtn.addEventListener('click', ()=>{
        video.muted = !video.muted;
        muteBtn.style.opacity = video.muted ? 1 : .85;
      });

      return card;
    }

    // Render initial feed
    DEMO.forEach(item=> feed.appendChild(createCard(item)));

    // Auto play/pause with IntersectionObserver
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const video = entry.target.querySelector('video');
        if(entry.isIntersecting && entry.intersectionRatio > 0.6){
          // Pause others
          document.querySelectorAll('video').forEach(v=>{ if(v!==video) v.pause(); });
          video.play().catch(()=>{});
        } else {
          video.pause();
        }
      });
    }, {threshold:[0, .6, 1]});

    document.querySelectorAll('.card').forEach(card=>observer.observe(card));

    // Keyboard navigation
    feed.addEventListener('keydown', (e)=>{
      const cards = [...document.querySelectorAll('.card')];
      const y = feed.scrollTop; const h = feed.clientHeight;
      const idx = Math.round(y / h);
      if(e.key === 'ArrowDown'){ e.preventDefault(); feed.scrollTo({top: (idx+1)*h, behavior:'smooth'}); }
      if(e.key === 'ArrowUp'){ e.preventDefault(); feed.scrollTo({top: Math.max(0,(idx-1)*h), behavior:'smooth'}); }
      if(e.code === 'Space'){ e.preventDefault(); const v = document.querySelector('.card video:not(:paused)') || cards[idx].querySelector('video'); if(v){ v.paused? v.play(): v.pause(); } }
    });

    // Comments drawer logic
    let currentComments = [];
    function openComments(item){
      currentComments = item.comments ? [...item.comments] : [];
      renderComments();
      drawer.classList.add('open');
      commentInput.focus();
    }
    function renderComments(){
      commentsList.innerHTML = '';
      currentComments.forEach(c=>{
        const row = document.createElement('div');
        row.className = 'comment';
        row.innerHTML = `
          <div class="avatar" style="background:url('https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(c.user)}') center/cover"></div>
          <div class="bubble"><strong>${escapeHtml(c.user)}</strong><br>${escapeHtml(c.text)}</div>
        `;
        commentsList.appendChild(row);
      });
    }
    function addComment(text){
      if(!text.trim()) return;
      currentComments.push({user:'@tú', text});
      renderComments();
      commentInput.value = '';
      commentsList.scrollTop = commentsList.scrollHeight;
    }
    sendComment.addEventListener('click', ()=> addComment(commentInput.value));
    commentInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addComment(commentInput.value); });
    drawer.addEventListener('click', (e)=>{ if(e.target===drawer) drawer.classList.remove('open'); });

    // Upload new video
    uploader.addEventListener('change', (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;
      const url = URL.createObjectURL(file);
      const item = {
        src: url,
        poster: '',
        user: '@tú',
        caption: file.name.replace(/\.[^.]+$/, ''),
        track: 'original',
        likes: 0,
        comments: []
      };
      const card = createCard(item);
      feed.prepend(card);
      observer.observe(card);
      // jump to top/new video
      feed.scrollTo({top: 0, behavior: 'smooth'});
      // ensure autoplay
      const v = card.querySelector('video');
      v.muted = true; // browsers require muted for autoplay
      setTimeout(()=> v.play().catch(()=>{}), 200);
    });

    // Helpers
    function bumpCount(el, diff){
      const n = parseCount(el.textContent) + diff;
      el.textContent = formatCount(Math.max(0,n));
    }
    function parseCount(txt){
      if(!txt) return 0;
      txt = String(txt).toLowerCase();
      if(txt.endsWith('k')) return Math.round(parseFloat(txt)*1000);
      if(txt.endsWith('m')) return Math.round(parseFloat(txt)*1000000);
      return parseInt(txt.replace(/[^0-9]/g,'')) || 0;
    }
    function formatCount(n){
      if(n>=1_000_000) return (n/1_000_000).toFixed(1).replace(/\.0$/,'')+'M';
      if(n>=1_000) return (n/1_000).toFixed(1).replace(/\.0$/,'')+'K';
      return String(n);
    }
    function animateHeart(el){
      el.classList.add('show');
      setTimeout(()=> el.classList.remove('show'), 550);
    }
    function escapeHtml(str){
      return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
    }

    // Improve focus ring for keyboard users
    document.addEventListener('keydown', (e)=>{ if(e.key==='Tab'){ document.body.classList.add('kb'); } });
  