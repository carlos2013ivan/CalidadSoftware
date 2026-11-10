// Mock de los modelos
jest.mock('../../models/cart', () => ({
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/cartItem', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/product', () => ({
  findByPk: jest.fn()
}));

const CartService = require('../../services/cartService');
const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');

describe('CartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addItemToCart', () => {

    it('Caso 1: Agregar 2 unidades con inventario de 10 - válida', async () => {
     
      const mockProduct = { id: 1, inventory: 10, price: 100 };
      
      const mockCartItem = { cartId: 1, productId: 1, quantity: 2 };
      
      Product.findByPk.mockResolvedValue(mockProduct);
      
      CartItem.findOne.mockResolvedValue(null);
      
      CartItem.create.mockResolvedValue(mockCartItem);
      
      const resultado = await CartService.addItemToCart(1, 1, 2);
      
      //Verificamos que se buscó el producto correcto
      expect(Product.findByPk).toHaveBeenCalledWith(1);
      //Verificamos que se agregaron las 2 unidades
      expect(CartItem.create).toHaveBeenCalledWith({
        cartId: 1,
        productId: 1,
        quantity: 2
      });
      //Verificamos que se devolvió el producto agregado
      expect(resultado).toEqual(mockCartItem);
    });

    it('Caso 2: Rechazar 15 unidades con inventario de 10 - inválida', async () => {
      
      Product.findByPk.mockResolvedValue({ id: 1, inventory: 10, price: 100 });
       
      const resultado = CartService.addItemToCart(1, 1, 15);
      
      //Verificamos que se muestra el error esperado
      await expect(resultado).rejects.toThrow('Not enough inventory available');
      //Verificamos que no se agregó ningún artículo
      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it('Caso 3: Rechazar producto inexistente 999 - inválida', async () => {
     
      Product.findByPk.mockResolvedValue(null);
      //Intentamos agregar el producto 999 al carrito
      const resultado = CartService.addItemToCart(1, 999, 2);
    
      //Verificamos que se muestra el error esperado
      await expect(resultado).rejects.toThrow('Product not found');
      //Verificamos que no se agregó ningún artículo
      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it('Caso 4: Agregar 3 unidades a un producto que ya tiene 2 en el carrito - válida', async () => {
      
      Product.findByPk.mockResolvedValue({ id: 1, inventory: 10, price: 100 });
    
      const mockItem = {
        cartId: 1,
        productId: 1,
        quantity: 2,
        save: jest.fn().mockResolvedValue()
      };
      //Simulamos que el producto ya está en el carrito
      CartItem.findOne.mockResolvedValue(mockItem);
      
      const resultado = await CartService.addItemToCart(1, 1, 3);
      
      //Verificamos que la cantidad aumentó de 2 a 5
      expect(resultado.quantity).toBe(5);
      //Verificamos que se guardó el cambio
      expect(mockItem.save).toHaveBeenCalledTimes(1);
      //Verificamos que no se creó otro artículo
      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it('Caso 5: Rechazar 3 unidades más cuando ya hay 8 y el inventario es 10 - inválida', async () => {
     
      Product.findByPk.mockResolvedValue({ id: 1, inventory: 10, price: 100 });
      
      const mockItem = {
        cartId: 1,
        productId: 1,
        quantity: 8,
        save: jest.fn().mockResolvedValue()
      };
      CartItem.findOne.mockResolvedValue(mockItem);
      
      const resultado = CartService.addItemToCart(1, 1, 3);
      
      //Verificamos que se muestra el error esperado
      await expect(resultado).rejects.toThrow('Not enough inventory available');
      //Verificamos que la cantidad no cambió y no se guardó
      expect(mockItem.quantity).toBe(8);
      expect(mockItem.save).not.toHaveBeenCalled();
      expect(CartItem.create).not.toHaveBeenCalled();
    });

  });

  describe('getCartItems', () => {

    it('Caso 6: Calcular subtotal e impuesto del carrito - válida', async () => {
    
      Cart.findByPk.mockResolvedValue({ id: 1 });
     
      const mockItem = {
        id: 1,
        cartId: 1,
        productId: 1,
        quantity: 2,
        Product: { price: 100, taxRate: 0.07 },
        toJSON: () => ({
          id: 1,
          cartId: 1,
          productId: 1,
          quantity: 2
        })
      };
      
      CartItem.findAll.mockResolvedValue([mockItem]);
      
      const resultado = await CartService.getCartItems(1);
      
      //Verificamos el subtotal
      expect(resultado.summary.subtotal).toBe(200);
      //Verificamos el impuesto
      expect(resultado.summary.totalTax).toBeCloseTo(14, 2);
      //Verificamos el total
      expect(resultado.summary.total).toBeCloseTo(214, 2);
      //Verificamos que el carrito contiene un producto
      expect(resultado.items).toHaveLength(1);
    });

    it('Caso 7: Rechazar consulta con ID de carrito no numérico - inválida', async () => {
      
      const resultado = CartService.getCartItems('abc');
      
      //Verificamos que se muestra el error esperado
      await expect(resultado).rejects.toThrow('Cart ID should be a number');
      //Verificamos que no se buscó ningún carrito
      expect(Cart.findByPk).not.toHaveBeenCalled();
      //Verificamos que no se consultaron artículos
      expect(CartItem.findAll).not.toHaveBeenCalled();
    });

  });

  describe('updateCartItem', () => {

    it('Caso 8: Actualizar cantidad a 5 con inventario de 10 - válida', async () => {
      
      const mockItem = {
        id: 1,
        quantity: 2,
        Product: { inventory: 10 },
        save: jest.fn().mockResolvedValue()
      };
      
      CartItem.findByPk.mockResolvedValue(mockItem);
      //Cambiamos la cantidad de 2 a 5
      const resultado = await CartService.updateCartItem(1, 5);
      
      //Verificamos que la cantidad cambió a 5
      expect(resultado.quantity).toBe(5);
      //Verificamos que se guardó el cambio
      expect(mockItem.save).toHaveBeenCalledTimes(1);
    });

    it('Caso 9: Rechazar actualizar a 15 unidades con inventario de 10 - inválida', async () => {
      
      const mockItem = {
        id: 1,
        quantity: 2,
        Product: { inventory: 10 },
        save: jest.fn().mockResolvedValue()
      };
      CartItem.findByPk.mockResolvedValue(mockItem);
     
      const resultado = CartService.updateCartItem(1, 15);
     
      //Verificamos que se muestra el error esperado
      await expect(resultado).rejects.toThrow('Not enough inventory available');
      //Verificamos que la cantidad no cambió
      expect(mockItem.quantity).toBe(2);
      //Verificamos que no se guardó el cambio
      expect(mockItem.save).not.toHaveBeenCalled();
    });

  });

  describe('removeCartItem', () => {

    it('Caso 10: Eliminar artículo existente del carrito - válida', async () => {
      
      const mockItem = {
        id: 1,
        quantity: 2,
        destroy: jest.fn().mockResolvedValue()
      };
     
      CartItem.findByPk.mockResolvedValue(mockItem);
      
      await CartService.removeCartItem(1);
   
      //Verificamos que se buscó el producto correcto
      expect(CartItem.findByPk).toHaveBeenCalledWith(1);
      //Verificamos que se ejecutó la eliminación
      expect(mockItem.destroy).toHaveBeenCalled();
    });

  });

});
