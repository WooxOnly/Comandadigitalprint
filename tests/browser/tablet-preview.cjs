// Renders the shipping React Native screens through React Native Web.
// Only providers, device services and network/storage are replaced by fixtures.
// This verifies layout; Android keyboard, socket, audio and battery need a device.
const path = require('node:path'), fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
async function buildTabletPreview(directory, { sourceOverrides = {} } = {}) {
  const esbuild = require('esbuild');
  const stubs = `
import React,{createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useWindowDimensions} from 'react-native';
import {Alert} from '${root}/src/ui/ThemedNative';
import {createOrderItem} from '${root}/orderItems';
import {translate,LOCALES} from '${root}/src/i18n/translations';
const noop=()=>{},asyncNoop=async()=>{},sub=()=>noop;
let licenseView={status:'unverified',deviceId:'11111111-1111-4111-8111-111111111111',expiresAt:null,checking:false,error:false};const licenseListeners=new Set();
export const licenseTabletId=async()=> '11111111-1111-4111-8111-111111111111',offlineLicenseForLink=async()=>({storeId:'seabra-1'});
export const tabletLicenseService=()=>({snapshot:()=>licenseView,subscribe:fn=>{licenseListeners.add(fn);return()=>licenseListeners.delete(fn)},refresh:asyncNoop,applyCode:async code=>{if(code!=='synthetic-code')throw Error('invalid');licenseView={...licenseView,status:'active',expiresAt:Date.now()+86400000};licenseListeners.forEach(fn=>fn())}});
let onlineView={enabled:false,receiving:false,visualAlert:true,soundAlert:false,pending:0,requests:[],error:'',loading:false};
export const useOnlineOrders=()=>({...useSyncExternalStore(cloud.subscribe,()=>onlineView),refresh:asyncNoop,decide:async(id,status)=>{onlineView={...onlineView,requests:onlineView.requests.map(r=>r.id===id?{...r,status}:r),pending:onlineView.requests.filter(r=>r.id!==id&&r.status==='pending').length};kitchenListeners.forEach(fn=>fn())}});
let profile={username:'admin',role:'admin'};
export let modules={preorders:true,cash:true,customers:true,preparation:true};
let kitchenSettings={allowReprint:true,useFinishButton:true};const kitchenListeners=new Set();
let access={menu:null,settings:null,reprint:null,restore:null};
const status={status:'SYNCED',pending:0,conflicts:[],lastSync:Date.now()};
export const cloud={subscribe:sub,pending:key=>key?false:[],status:()=>status,sync:asyncNoop,modules:()=>modules,access:()=>access,preparationSettings:()=>kitchenSettings,authorizePreparationReprint:asyncNoop,allowed:()=>true,storeName:()=> 'Loja sintética · São José',identity:()=> 'tablet-test',get:async()=>null,list:async()=>[],write:asyncNoop,customerHistory:async()=>({sales:[],preorders:[]}),recoverFromCloud:asyncNoop};
cloud.preparationCorrectionUsers=async()=>({users:[{username:'admin',role:'admin'},{username:'will',role:'manager'}]});
cloud.cancellationUsers=async()=>({users:[{username:'admin',role:'admin'},{username:'will',role:'manager'}]});
cloud.role=username=>username==='admin'?'admin':profile.role;
cloud.subscribe=fn=>{kitchenListeners.add(fn);return()=>kitchenListeners.delete(fn)};
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
 const [history,setHistory]=useState([order]);
 const [orderSettings,setOrderSettings]=useState({requireCustomer:false,requireTableForTakeout:false});
 const [draftItems,setOrderItems]=useState(items),[category,setCategoryValue]=useState('Todos'),[subcategory,setSubcategory]=useState(''),[productSearch,setProductSearch]=useState('');
 const setCategory=value=>{setCategoryValue(value);setSubcategory('')};
 const categories=[...new Set(products.map(p=>p.category)),'Todos'],subcategories=category==='Todos'?[]:[...new Set(products.filter(p=>p.category===category).map(p=>p.subcategory).filter(Boolean))];
 const filteredMenu=products.filter(p=>(category==='Todos'||p.category===category)&&(!subcategory||p.subcategory===subcategory)&&(!productSearch||p.name.toLowerCase().includes(productSearch.toLowerCase())));
 const [preparation,setPreparation]=useState([]);
 const correctPreparation=async(orderId,status,username,password,expected)=>{if(username&&password!=='synthetic-approval')throw Error('Usuário ou senha incorretos.');window.qa.preparationCorrections.push({orderId,status,username});setPreparation(values=>values.map(value=>value.orderId===orderId?{...value,status:status||'preparing',updatedAt:new Date().toISOString(),correction:{at:new Date().toISOString(),requestedBy:profile.username,authorizedBy:username||null}}:value))};
 const productConsumer=useRef(null);
 const [preorders,setPreorders]=useState([{id:'preorder-1',customer:'Cliente sintético',contact:'5551234567',address:'',fulfillment:'pickup',dueAt:new Date(Date.now()+3600000).toISOString(),createdAt:new Date().toISOString(),status:'scheduled',items}]);
 const savePreorder=async input=>{const record={...input,id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'scheduled'};window.qa.savedPreorders.push(record);setPreorders(previous=>[...previous,record]);return record};
 const cancelPreorder=async(id,username,password)=>{if(password!=='synthetic-approval')throw Error('Usuário ou senha incorretos.');window.qa.cancellations.push({id,username});setPreorders(previous=>previous.map(record=>record.id===id?{...record,status:'cancelled',cancellation:{authorizedBy:username,requestedBy:profile.username,at:new Date().toISOString()}}:record))};
 const [productOptions,setProductOptions]=useState({});
 const [customPlate,setCustomPlate]=useState(''),[serviceMode,setServiceMode]=useState('dine_in'),[productNote,setProductNote]=useState('');
 const [customer,setCustomer]=useState('Cliente sintético'),[plate,setPlate]=useState('1'),[previewOrder,setPreviewOrder]=useState(null),[selectedProduct,setSelectedProduct]=useState(null),[language,setLanguage]=useState(new URLSearchParams(location.search).get('language')||'pt'),[route,setRoute]=useState(location.hash.slice(1)||'/');
 useEffect(()=>{const refresh=()=>setRoute(location.hash.slice(1)||'/');addEventListener('hashchange',refresh);window.qa={setOnline:value=>{onlineView={...onlineView,...value};kitchenListeners.forEach(fn=>fn())},menuSaves:[],failMenuSave:false,setOrderItems,setPlate,setServiceMode,setOrderSettings,preparationCorrections:[],setPreparation,setKitchenFinishButton:value=>{kitchenSettings={...kitchenSettings,useFinishButton:value};kitchenListeners.forEach(fn=>fn())},savedPreorders:[],cancellations:[],setCatalog:value=>{products.splice(0,products.length,...value);setHistory(previous=>[...previous])},setAccess:value=>{access={...access,...value};kitchenListeners.forEach(fn=>fn())},setProfile:value=>{profile=value;kitchenListeners.forEach(fn=>fn())},setHistory,setModules:value=>{modules={...modules,...value};kitchenListeners.forEach(fn=>fn())},setLicense:value=>{licenseView={...licenseView,...value};licenseListeners.forEach(fn=>fn())},printCalls:[],setKitchenReprint:value=>{kitchenSettings={...kitchenSettings,allowReprint:value};kitchenListeners.forEach(fn=>fn())},setLanguage,setPreviewOrder,setSelectedProduct,openReceipt:()=>setPreviewOrder(order),openProduct:()=>setSelectedProduct(products[0])};const previousAlert=Alert.alert;Alert.alert=(title,message,buttons)=>{window.qa.lastAlert={title,message};window.qa.confirmAlert=()=>buttons?.find(button=>button.style==='destructive')?.onPress?.();};return()=>{Alert.alert=previousAlert;removeEventListener('hashchange',refresh)}},[]);
 const app={saveMenu:async(next,options)=>{if(window.qa.failMenuSave)return false;const {isValidMenu}=await import('${root}/shared/menu-validation.mjs');if(!isValidMenu(next))return false;window.qa.menuSaves.push({menu:structuredClone(next),options:options?structuredClone(options):null});products.splice(0,products.length,...next);if(options)setProductOptions(previous=>({...previous,[options.productId]:{available:true,favorite:false,...previous[options.productId],...options}}));setHistory(previous=>[...previous]);return true},customer,setCustomer,changeCustomer:setCustomer,plate,setPlate,setPreviewOrder,previewOrder,selectedProduct,setSelectedProduct,openProduct:(product,consumer)=>{productConsumer.current=consumer;setProductNote('');setSelectedProduct(product)},addSelectedProduct:()=>{const item=createOrderItem(selectedProduct,productNote,null,null,[]);if(productConsumer.current)productConsumer.current(item);else setOrderItems(previous=>[...previous,item]);setSelectedProduct(null);productConsumer.current=null},preparation,correctPreparation,preorders,savePreorder,cancelPreorder,history,printSavedOrder:(order,isNew=false,source='history')=>{window.qa.printCalls.push({id:order.id,isNew,source});setPreviewOrder(order)},items:draftItems,changeQuantity:(id,delta)=>setOrderItems(previous=>previous.map(item=>item.id===id?{...item,quantity:item.quantity+delta}:item).filter(item=>item.quantity>0)),menu:products,filteredMenu,pizzaMenu:[],categories,category,setCategory,subcategories,subcategory,setSubcategory,productOptions,productSearch,setProductSearch,favoritesOnly:false,orderSettings,setRequireCustomer:value=>setOrderSettings(previous=>({...previous,requireCustomer:value})),setRequireTableForTakeout:value=>setOrderSettings(previous=>({...previous,requireTableForTakeout:value})),customerError:false,serviceMode,setServiceMode,customPlate,setCustomPlate,printerSettings:printer,printedDestinations:[],isReady:true,sending:false,printing:false,updatingMenu:false,savingOrderSettings:false,feedback:null,logoUri:null,pizzaMode:null,secondFlavor:null,extras:[],extraPlacement:'whole',productNote,setProductNote,menuUpdateStatus:null};
 const value=new Proxy(app,{get:(target,key)=>key in target?target[key]:noop});
 return <Route.Provider value={route}><Language.Provider value={{language,locale:LOCALES[language],t:text=>translate(text,language),setLanguage:async value=>{localStorage.setItem('qa-language',value);setLanguage(value)},ready:true}}><App.Provider value={value}>{children}</App.Provider></Language.Provider></Route.Provider>;
}
export function useApp(){const app=useContext(App),{width,fontScale}=useWindowDimensions();return {...app,isWide:width>=760&&fontScale<1.4}}
export const useLanguage=()=>useContext(Language),usePreviewRoute=()=>useContext(Route),useLocalSearchParams=()=>({id:order.id});
export function usePathname(){const route=usePreviewRoute();return route==='/settings-access'?'/printer':route}
export const router={navigate:target=>location.hash=typeof target==='string'?target:target.pathname,push:target=>location.hash=typeof target==='string'?target:target.pathname,replace:target=>location.hash=target};
export function useFocusEffect(effect){useEffect(effect,[effect])}
const service={canCorrectPreparation:()=>['admin','manager'].includes(profile.role)||profile.correctPreparation===true,preparationAuthorizers:()=>[{username:'admin',role:'admin'},{username:'will',role:'manager'}],currentRole:()=>profile.role,loginUsers:()=>['admin','chef'],listUsers:()=>[{username:'chef',active:true,role:'cook'}],subscribe:sub,load:asyncNoop,lockSettings:noop};
export const useAuth=()=>({currentUser:useSyncExternalStore(cloud.subscribe,()=>profile.username),signedIn:usePathname()!=='/login',exists:true,ready:true,loading:false,service,logout:()=>router.navigate('/login'),login:async()=>({ok:true}),changeOwnPassword:asyncNoop,load:asyncNoop});
export const useBusiness=()=>{const app=useApp();return {modules,customers:[{id:'customer-1',name:'Cliente sintético · '+'Nome longo '.repeat(6),phone:'5551234567',email:'example@example.com',addresses:['Endereço sintético'],notes:'',active:true}],preparation:app.preparation,correctPreparation:app.correctPreparation,busy:false,pendingCash:null,overview:{settings:{managers:[],tax:{enabled:true,rateBps:750}},sessions:[{id:'cash-1',deviceId:'tablet-test',openedAt:new Date().toISOString(),openedBy:'admin',openingCents:10000,closedAt:null,summary:{cashCents:0,cardCents:0,zelleCents:0,inCents:0,outCents:0,expectedCents:10000}}],entries:[],receipts:[]},saveCustomer:asyncNoop,savePreorder:app.savePreorder,preorders:app.preorders,cancelPreorder:app.cancelPreorder,setPreorderStatus:asyncNoop,advancePreparation:asyncNoop,cashCommand:asyncNoop}};
export const useKitchenAlerts=()=>({sound:false,unread:[],toggleSound:asyncNoop,testSound:asyncNoop,acknowledge:noop});
export const StatusBar=()=>null,randomUUID=()=>crypto.randomUUID(),printAsync=asyncNoop,printToFileAsync=async()=>({uri:'preview-only'});
`;
  const entry = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {Fixture,usePreviewRoute} from 'qa:stubs';
import {AppShell} from '${root}/src/ui/AppShell';import {AppearanceProvider} from '${root}/src/ui/AppearanceContext';import {LoginGate,SettingsGate} from '${root}/src/ui/AccessGate';
import {StoreGate} from '${root}/src/ui/StoreGate';import {LicenseGate} from '${root}/src/ui/LicenseGate';
${['Home','Order','Menu','History','HistoryDetail','Printer','Preparation','Customers','Preorders','Cash','CashReports','Backups','OnlineOrders'].map(name=>`import ${name} from '${root}/src/screens/${name}Screen';`).join('\n')}
function Screens(){const route=usePreviewRoute();if(route==='/link')return <StoreGate><div>Linked fixture</div></StoreGate>;if(route==='/license')return <LicenseGate><div data-testid="licensed-content">Operational app</div></LicenseGate>;const components={'/':Home,'/order':Order,'/menu':Menu,'/history':History,'/history/detail':HistoryDetail,'/printer':Printer,'/settings-access':Printer,'/preparation':Preparation,'/customers':Customers,'/preorders':Preorders,'/cash':Cash,'/cash-reports':CashReports,'/backups':Backups,'/online':OnlineOrders};const Component=components[route]||Home;return <LoginGate><AppShell>{route==='/settings-access'?<SettingsGate><Component/></SettingsGate>:<Component/>}</AppShell></LoginGate>}
createRoot(document.getElementById('root')).render(<AppearanceProvider><Fixture><Screens/></Fixture></AppearanceProvider>);
`;
  const intercept = /(?:^expo-router$|^expo-status-bar$|^expo-crypto$|^expo-print$|\/state\/(?:AppContext|AuthContext|BusinessContext|OnlineOrdersContext)$|\/i18n\/LanguageContext$|\/services\/(?:cloudStorage|diagnostics|licenseRuntime)$|\/config\/store$|\/ui\/useKitchenAlerts$|\.\/useKitchenAlerts$)/;
  await esbuild.build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:true,outfile:path.join(directory,'tablet-preview.js'),platform:'browser',mainFields:['browser','module','main'],resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.jsx','.js','.json'],format:'iife',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"test"','__DEV__':'false'},nodePaths:[path.join(root,'node_modules')],loader:{'.png':'dataurl'},plugins:[{name:'fixture-services',setup(build){
    build.onLoad({filter:/\.[cm]?[jt]sx?$/},args=>sourceOverrides[args.path] === undefined ? undefined : {contents:sourceOverrides[args.path],loader:args.path.endsWith('tsx')?'tsx':'ts',resolveDir:path.dirname(args.path)});
    build.onResolve({filter:/^qa:stubs$/},()=>({path:'stubs',namespace:'qa'}));
    // This fixture represents the complete native offline cache. Remote web
    // queries are exercised separately with the real Expo export and backend.
    build.onResolve({filter:/\/services\/useOrderQuery$/},()=>({path:path.join(root,'src/services/useOrderQuery.ts')}));
    build.onResolve({filter:intercept},()=>({path:'stubs',namespace:'qa'}));
    build.onResolve({filter:/^react-native$/},()=>({path:require.resolve('react-native-web',{paths:[root]})}));
    build.onResolve({filter:/^react-native-webview$/},()=>({path:'webview',namespace:'qa'}));
    build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:args.path==='stubs'?stubs:`import React,{forwardRef,useImperativeHandle,useRef} from 'react';export default forwardRef(function WebView({source,style,onLoadEnd},ref){const iframe=useRef(null);useImperativeHandle(ref,()=>({injectJavaScript:()=>{}}));return <iframe title='Receipt' ref={iframe} srcDoc={source.html} style={{width:style.width,flex:1,border:0}} onLoad={onLoadEnd}/>});`,loader:'tsx',resolveDir:root}));
  }}]});
  fs.writeFileSync(path.join(directory,'tablet-preview.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BistroHub layout verification</title><style>html,body,#root{margin:0;width:100%;height:100%;}#root{display:flex;flex-direction:column}body{overflow:hidden}</style></head><body><div id="root"></div><script src="/tablet-preview.js"></script></body></html>');
}
module.exports={buildTabletPreview};
