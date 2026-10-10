// Renders the shipping React Native screens through React Native Web.
// Only providers, device services and network/storage are replaced by fixtures.
// This verifies layout; Android keyboard, socket, audio and battery need a device.
const path = require('node:path'), fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
async function buildTabletPreview(directory) {
  const esbuild = require('esbuild');
  const stubs = `
import React,{createContext,useContext,useEffect,useState} from 'react';
import {useWindowDimensions} from 'react-native';
import {translate,LOCALES} from '${root}/src/i18n/translations';
const noop=()=>{},asyncNoop=async()=>{},sub=()=>noop;
export const modules={preorders:true,cash:true,customers:true,preparation:true};
const access={menu:null,settings:null,reprint:null,restore:null};
const status={status:'SYNCED',pending:0,conflicts:[],lastSync:Date.now()};
export const cloud={subscribe:sub,pending:()=>[],status:()=>status,sync:asyncNoop,modules:()=>modules,access:()=>access,storeName:()=> 'Loja sintética · São José',identity:()=> 'tablet-test',get:async()=>null,list:async()=>[],write:asyncNoop,customerHistory:async()=>({sales:[],preorders:[]}),recoverFromCloud:asyncNoop};
cloud.cashReport=async()=>({storeName:cloud.storeName(),timeZone:'America/New_York',generatedAt:new Date().toISOString(),totals:Object.fromEntries(['grossCents','discountCents','taxCents','reversedCents','taxReversedCents','netSalesCents','netTaxCents','tipCents','tipReversedCents','netTipCents','deliveryFeeCents','deliveryFeeReversedCents','netDeliveryFeeCents','netReceiptsCents','inCents','outCents'].map(key=>[key,12345])),methods:['cash','card','zelle'].map(method=>({method,netCents:1234,receivedCents:1234,reversedCents:0})),days:[{day:'2026-10-08',netReceiptsCents:1234,salesCount:12,voidCount:0,refundCount:1,netSalesCents:1234,netTaxCents:92}],products:products.map(product=>({...product,netSalesCents:1234,soldQuantity:12,reversedQuantity:1})),closings:[{id:'close-1',closedAt:new Date().toISOString(),closedBy:'Usuário sintético com nome longo e acentuação',expectedCents:1234,countedCents:1234,differenceCents:0,deviceId:'Tablet sintético com identificação longa'}],movements:[{id:'movement-1',kind:'sale',amountCents:1234,createdAt:new Date().toISOString(),actor:'Operador sintético',reason:'Motivo de teste com acentuação.'}]});
export const appStorage={getItem:async()=>null,setItem:asyncNoop};
export const listVerifiedBackups=async()=>[{name:'synthetic-backup',createdAt:new Date().toISOString(),valid:true,records:10,orders:4,pending:0}],recoverLocalBackup=async()=>0,ensureLocalBackup=asyncNoop;
export const getStoreId=()=> 'seabra-1',loadStoreId=async()=>null,validStoreId=()=>true,bindStoreId=asyncNoop;
export const logError=noop,startDiagnostics=()=>noop;
const long='Produto sintético com descrição longa e acentuação · '+ 'Detalhes e opções '.repeat(8);
export const products=Array.from({length:12},(_,n)=>({id:'product-'+n,name:n===0?long:'Pizza '+n,category:n<8?'Categoria '+n:'Pizzas',description:'Descrição de teste · ingredientes cadastrados pelo restaurante.',price:12.34,kind:'regular'}));
export const items=products.slice(0,8).map((product,n)=>({id:'item-'+n,productId:product.id,name:product.name,category:product.category,quantity:2,note:'Observação livre com acentuação.',unitPriceCents:1234}));
export const order={id:'synthetic-order',number:'0001',plate:'1',serviceMode:'dine_in',customer:'Cliente sintético',createdAt:new Date().toISOString(),items};
const routing={enabled:true,destinations:items.map((item,n)=>({id:'destination-'+n,name:'Destino '+n+' · '+'Cozinha '.repeat(8),address:'192.0.2.'+(n+1),port:'9100',paperWidth:'80',categories:[item.category]}))};
export const printer={connection:'wifi',paperWidth:'80',address:'192.0.2.1',port:'9100',name:'',automatic:false,routing};
const App=createContext(null),Language=createContext(null),Route=createContext('/');
export function Fixture({children}){
 const [customer,setCustomer]=useState('Cliente sintético'),[plate,setPlate]=useState('1'),[previewOrder,setPreviewOrder]=useState(null),[selectedProduct,setSelectedProduct]=useState(null),[language,setLanguage]=useState(new URLSearchParams(location.search).get('language')||'pt'),[route,setRoute]=useState(location.hash.slice(1)||'/');
 useEffect(()=>{const refresh=()=>setRoute(location.hash.slice(1)||'/');addEventListener('hashchange',refresh);window.qa={setLanguage,setPreviewOrder,setSelectedProduct,openReceipt:()=>setPreviewOrder(order),openProduct:()=>setSelectedProduct(products[0])};return()=>removeEventListener('hashchange',refresh)},[]);
 const app={customer,setCustomer,changeCustomer:setCustomer,plate,setPlate,setPreviewOrder,previewOrder,selectedProduct,setSelectedProduct,openProduct:setSelectedProduct,history:[order],items,menu:products,filteredMenu:products,pizzaMenu:[],categories:['Todos','Pizzas'],category:'Todos',subcategories:[],subcategory:'Todos',productOptions:{},productSearch:'',favoritesOnly:false,orderSettings:{requireCustomer:false},customerError:false,serviceMode:'dine_in',customPlate:'',printerSettings:printer,printedDestinations:[],isReady:true,sending:false,printing:false,updatingMenu:false,savingOrderSettings:false,feedback:null,logoUri:null,pizzaMode:null,secondFlavor:null,extras:[],extraPlacement:'whole',productNote:'',menuUpdateStatus:null};
 const value=new Proxy(app,{get:(target,key)=>key in target?target[key]:noop});
 return <Route.Provider value={route}><Language.Provider value={{language,locale:LOCALES[language],t:text=>translate(text,language),setLanguage:async value=>{localStorage.setItem('qa-language',value);setLanguage(value)},ready:true}}><App.Provider value={value}>{children}</App.Provider></Language.Provider></Route.Provider>;
}
export function useApp(){const app=useContext(App),{width,fontScale}=useWindowDimensions();return {...app,isWide:width>=760&&fontScale<1.4}}
export const useLanguage=()=>useContext(Language),usePreviewRoute=()=>useContext(Route),useLocalSearchParams=()=>({id:order.id});
export function usePathname(){const route=usePreviewRoute();return route==='/settings-access'?'/printer':route}
export const router={navigate:target=>location.hash=typeof target==='string'?target:target.pathname,push:target=>location.hash=typeof target==='string'?target:target.pathname,replace:target=>location.hash=target};
export function useFocusEffect(effect){useEffect(effect,[effect])}
const service={loginUsers:()=>['admin','chef'],listUsers:()=>[{username:'admin',active:true},{username:'chef',active:true}],subscribe:sub,load:asyncNoop,lockSettings:noop};
export const useAuth=()=>({currentUser:'admin',signedIn:usePathname()!=='/login',exists:true,ready:true,loading:false,service,logout:()=>router.navigate('/login'),login:async()=>({ok:true}),changeOwnPassword:asyncNoop,load:asyncNoop});
export const useBusiness=()=>({modules,customers:[{id:'customer-1',name:'Cliente sintético · '+'Nome longo '.repeat(6),phone:'5551234567',email:'example@example.com',addresses:['Endereço sintético'],notes:'',active:true}],preorders:[{id:'preorder-1',customer:'Cliente sintético',contact:'5551234567',address:'',fulfillment:'pickup',dueAt:new Date(Date.now()+3600000).toISOString(),createdAt:new Date().toISOString(),status:'scheduled',items}],preparation:[],busy:false,pendingCash:null,overview:{settings:{managers:[],tax:{enabled:true,rateBps:750}},sessions:[{id:'cash-1',deviceId:'tablet-test',openedAt:new Date().toISOString(),openedBy:'admin',openingCents:10000,closedAt:null,summary:{cashCents:0,cardCents:0,zelleCents:0,inCents:0,outCents:0,expectedCents:10000}}],entries:[],receipts:[]},saveCustomer:asyncNoop,savePreorder:asyncNoop,setPreorderStatus:asyncNoop,advancePreparation:asyncNoop,cashCommand:asyncNoop});
export const useKitchenAlerts=()=>({sound:false,unread:[],toggleSound:asyncNoop,testSound:asyncNoop,acknowledge:noop});
export const StatusBar=()=>null,randomUUID=()=>crypto.randomUUID(),printAsync=asyncNoop,printToFileAsync=async()=>({uri:'preview-only'});
`;
  const entry = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {Fixture,usePreviewRoute} from 'qa:stubs';
import {AppShell} from '${root}/src/ui/AppShell';import {LoginGate,SettingsGate} from '${root}/src/ui/AccessGate';
import {StoreGate} from '${root}/src/ui/StoreGate';
${['Home','Order','Menu','History','HistoryDetail','Printer','Preparation','Customers','Preorders','Cash','CashReports','Backups'].map(name=>`import ${name} from '${root}/src/screens/${name}Screen';`).join('\n')}
function Screens(){const route=usePreviewRoute();if(route==='/link')return <StoreGate><div>Linked fixture</div></StoreGate>;const components={'/':Home,'/order':Order,'/menu':Menu,'/history':History,'/history/detail':HistoryDetail,'/printer':Printer,'/settings-access':Printer,'/preparation':Preparation,'/customers':Customers,'/preorders':Preorders,'/cash':Cash,'/cash-reports':CashReports,'/backups':Backups};const Component=components[route]||Home;return <LoginGate><AppShell>{route==='/settings-access'?<SettingsGate><Component/></SettingsGate>:<Component/>}</AppShell></LoginGate>}
createRoot(document.getElementById('root')).render(<Fixture><Screens/></Fixture>);
`;
  const intercept = /(?:^expo-router$|^expo-status-bar$|^expo-crypto$|^expo-print$|\/state\/(?:AppContext|AuthContext|BusinessContext)$|\/i18n\/LanguageContext$|\/services\/(?:cloudStorage|diagnostics)$|\/config\/store$|\/ui\/useKitchenAlerts$|\.\/useKitchenAlerts$)/;
  await esbuild.build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:true,outfile:path.join(directory,'tablet-preview.js'),platform:'browser',mainFields:['browser','module','main'],resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.jsx','.js','.json'],format:'iife',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"test"','__DEV__':'false'},nodePaths:[path.join(root,'node_modules')],loader:{'.png':'dataurl'},plugins:[{name:'fixture-services',setup(build){
    build.onResolve({filter:/^qa:stubs$/},()=>({path:'stubs',namespace:'qa'}));
    build.onResolve({filter:intercept},()=>({path:'stubs',namespace:'qa'}));
    build.onResolve({filter:/^react-native$/},()=>({path:require.resolve('react-native-web',{paths:[root]})}));
    build.onResolve({filter:/^react-native-webview$/},()=>({path:'webview',namespace:'qa'}));
    build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:args.path==='stubs'?stubs:`import React,{forwardRef,useImperativeHandle,useRef} from 'react';export default forwardRef(function WebView({source,style,onLoadEnd},ref){const iframe=useRef(null);useImperativeHandle(ref,()=>({injectJavaScript:()=>{}}));return <iframe title='Receipt' ref={iframe} srcDoc={source.html} style={{width:style.width,flex:1,border:0}} onLoad={onLoadEnd}/>});`,loader:'tsx',resolveDir:root}));
  }}]});
  fs.writeFileSync(path.join(directory,'tablet-preview.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BistroHub layout verification</title><style>html,body,#root{margin:0;width:100%;height:100%;}#root{display:flex;flex-direction:column}body{overflow:hidden}</style></head><body><div id="root"></div><script src="/tablet-preview.js"></script></body></html>');
}
module.exports={buildTabletPreview};
