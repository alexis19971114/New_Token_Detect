import { Router } from 'express';

import { 
    getContractInfo         , 
    getContractInfoByPair   , 
    setContractLevel        ,
    deleteOldTokens         ,
} from '../controllers/contractInfo.js';

export const contractInfoRouter = Router();

contractInfoRouter.get ('/'                     ,   getContractInfo);
contractInfoRouter.get ('/pair'                 ,   getContractInfoByPair);
contractInfoRouter.post('/setTokenLevel'        ,   setContractLevel);
contractInfoRouter.post('/deleteOldTokens'      ,   deleteOldTokens);