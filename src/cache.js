import fs from 'node:fs/promises';
import path from 'node:path';

export class FileCache {
  constructor({dataDir=process.env.PREFLIGHT_DATA_DIR ?? path.resolve('.preflight-data'), ttlMs=Number(process.env.PREFLIGHT_CACHE_TTL_MS || 15*60*1000)}={}){
    this.file=path.join(dataDir,'cache.json');
    this.ttlMs=ttlMs;
    this.loaded=false;
    this.map=new Map();
  }
  async init(){
    if(this.loaded)return;
    try{const rows=JSON.parse(await fs.readFile(this.file,'utf8'));for(const row of rows)this.map.set(row.key,row);}catch(e){if(e?.code!=='ENOENT')throw e}
    this.loaded=true;
  }
  async get(key){
    await this.init();
    const row=this.map.get(key);
    if(!row)return null;
    const age=Date.now()-Date.parse(row.observedAt);
    if(!Number.isFinite(age)||age>this.ttlMs){this.map.delete(key);return null;}
    return {...row.value,cache:{hit:true,ageMs:age,observedAt:row.observedAt,ttlMs:this.ttlMs}};
  }
  async put(key,value){
    await this.init();
    const row={key,observedAt:new Date().toISOString(),value};
    this.map.set(key,row);
    await fs.mkdir(path.dirname(this.file),{recursive:true});
    const tmp=`${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp,JSON.stringify([...this.map.values()],null,2));
    await fs.rename(tmp,this.file);
    return {...value,cache:{hit:false,ageMs:0,observedAt:row.observedAt,ttlMs:this.ttlMs}};
  }
}
