// Natural sort so ..._10.png doesn't come before ..._2.png
const reqArr = (r) =>
    r.keys()
     .sort((a,b) => {
       const na = +(a.match(/\d+/g)?.pop() ?? 0);
       const nb = +(b.match(/\d+/g)?.pop() ?? 0);
       return na - nb;
     })
     .map(r);
  
  // PLAYER
  export const PLAYER_IDLE = reqArr(require.context("./", false, /Owlet_Monster_Idle_\d+\.(png|webp|svg)$/));
  export const PLAYER_CHEER = reqArr(require.context("./", false, /Owlet_Monster_celebrate_\d+\.(png|webp|svg)$/));
  
  // If you don't have evil art yet, temporarily reuse player frames:
  export const EVIL_IDLE = PLAYER_IDLE;
  export const EVIL_RUSH = PLAYER_IDLE;
  