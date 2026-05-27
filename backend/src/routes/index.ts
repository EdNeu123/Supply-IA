import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { webhookController } from '../controllers/webhookController';
import { productController } from '../controllers/productController';
import { supplierController } from '../controllers/supplierController';
import { rfqController } from '../controllers/rfqController';
import { quoteController } from '../controllers/quoteController';
import { purchaseOrderController } from '../controllers/purchaseOrderController';
import { movimentacaoController } from '../controllers/movimentacaoController';

const router = Router();

// Pública
router.post('/webhook/telegram', webhookController.handle);

// Protegidas
router.use(requireAuth);

router.get('/products',        productController.list);
router.post('/products',       productController.create);
router.put('/products/:id',    productController.update);
router.delete('/products/:id', productController.delete);

router.get('/suppliers',        supplierController.list);
router.post('/suppliers',       supplierController.create);
router.put('/suppliers/:id',    supplierController.update);
router.delete('/suppliers/:id', supplierController.delete);

router.get('/rfqs',             rfqController.list);
router.post('/rfqs',            rfqController.triggerRfq);

router.get('/quotes',            quoteController.list);
router.post('/quotes/simulate',  quoteController.simulate);

router.get('/purchase-orders',              purchaseOrderController.list);
router.post('/purchase-orders',             purchaseOrderController.create);
router.put('/purchase-orders/:id/status',   purchaseOrderController.updateStatus);

router.get('/movimentacoes',  movimentacaoController.list);
router.post('/movimentacoes', movimentacaoController.create);

export default router;
