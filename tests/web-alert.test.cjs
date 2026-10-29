const assert=require('node:assert/strict'),{test}=require('node:test'),{loadTs}=require('./helpers/load-ts.cjs'),fs=require('node:fs');
test('web alerts queue confirmations, cancel safely, execute once and preserve a callback-created alert',()=>{
 const {Alert,alertStore}=loadTs('src/ui/AppAlert.web.ts'),events=[];let changes=0;const stop=alertStore.subscribe(()=>changes++);
 Alert.alert('First','Confirm',[{text:'Cancel',style:'cancel'},{text:'Confirm',onPress:()=>{events.push('confirmed');Alert.alert('Result')}}]);const first=alertStore.snapshot();assert.equal(first.title,'First');
 alertStore.dismiss(first.id);assert.equal(alertStore.snapshot(),first);alertStore.choose(first.id,10);assert.deepEqual(events,[]);alertStore.choose(first.id,1);alertStore.choose(first.id,1);assert.deepEqual(events,['confirmed']);assert.equal(alertStore.snapshot().title,'Result');assert.equal(alertStore.snapshot().buttons[0].text,'OK');alertStore.choose(alertStore.snapshot().id,0);assert.equal(alertStore.snapshot(),null);
 Alert.alert('Cancel me','',[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>events.push('delete')}]);alertStore.choose(alertStore.snapshot().id,0);assert.deepEqual(events,['confirmed']);
 Alert.alert('Dismiss','',undefined,{cancelable:true,onDismiss:()=>events.push('dismiss')});alertStore.dismiss(alertStore.snapshot().id);assert.deepEqual(events,['confirmed','dismiss']);Alert.alert('Private pending');alertStore.clear();assert.equal(alertStore.snapshot(),null);assert.ok(changes>5);stop();
});
test('application call sites use the platform Alert adapter; native bridge remains unchanged',()=>{
 assert.match(fs.readFileSync('src/ui/AppAlert.ts','utf8'),/export \{ Alert \} from 'react-native'/);
 for(const file of fs.readdirSync('src/screens').map(f=>'src/screens/'+f).concat(fs.readdirSync('src/state').map(f=>'src/state/'+f))){if(!/\.tsx?$/.test(file))continue;const source=fs.readFileSync(file,'utf8');assert.ok(!/import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*['"]react-native['"]/.test(source),file+' bypasses the web Alert adapter')}
});
