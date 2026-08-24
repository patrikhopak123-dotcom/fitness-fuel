const articles=[
{title:"5 Most Common Training Mistakes",tag:"TRAINING",date:"May 15, 2024",img:"https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=700&q=80"},
{title:"How to Eat for Muscle Growth",tag:"NUTRITION",date:"May 10, 2024",img:"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80"},
{title:"The Best Back Exercises",tag:"TRAINING",date:"May 7, 2024",img:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80"},
{title:"How to Stay Motivated",tag:"MOTIVATION",date:"May 5, 2024",img:"https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=700&q=80"},
{title:"How to Lose Belly Fat",tag:"FAT LOSS",date:"May 1, 2024",img:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=700&q=80"},
{title:"Leg Workout for Maximum Growth",tag:"TRAINING",date:"Apr 28, 2024",img:"https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=700&q=80"}
];
function card(a){return `<article class="card"><div class="card-img" style="background-image:url('${a.img}')"></div><div class="card-body"><span class="tag">${a.tag}</span><h3>${a.title}</h3><div class="card-meta"><span>${a.date}</span><a href="#">READ MORE →</a></div></div></article>`}
function render(){document.getElementById("cards").innerHTML=articles.slice(0,4).map(card).join("");document.getElementById("drawerArticles").innerHTML=articles.map(a=>`<div class="drawer-item"><img src="${a.img}"><div><b>${a.title}</b><small>${a.date} · ${a.tag}</small></div></div>`).join("")}
function toggleDrawer(){document.getElementById("drawer").classList.toggle("open")}
function openAuth(){document.getElementById("auth").classList.remove("hidden")}
function closeAuth(){document.getElementById("auth").classList.add("hidden")}
document.getElementById("subscribe").addEventListener("submit",e=>{e.preventDefault();e.target.innerHTML="<b style='color:#58c66a'>You're subscribed. Welcome to Fitness Fuel! 💪</b>"});
render();