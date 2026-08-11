import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import coinsRouter from "./coins";
import productsRouter from "./products";
import campaignsRouter from "./campaigns";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/coins", coinsRouter);
router.use("/products", productsRouter);
router.use("/campaigns", campaignsRouter);

export default router;
