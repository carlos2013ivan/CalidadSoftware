// Mock the models before requiring the service
jest.mock('../../models/product', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    belongsTo: jest.fn()  // Mock the association method
}));

jest.mock('../../models/category', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
}));

// Now require the service after the mocks are set up
const ProductService = require('../../services/productService');
const Product = require('../../models/product');
const Category = require('../../models/category');
const { Op } = require('sequelize');

describe('ProductService', () => {
    // Clear all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getProductById', () => {
        it('Caso 11: Buscar producto existente con ID 1 - válida', async () => {
         
            const mockProduct = { id: 1, name: 'Laptop', price: 500 };
           
            Product.findByPk.mockResolvedValue(mockProduct);
            
            const resultado = await ProductService.getProductById(1);
       
            //Verificamos que se buscó el producto correcto
            expect(Product.findByPk).toHaveBeenCalledWith(1);
            //Verificamos que se devolvió el producto
            expect(resultado).toEqual(mockProduct);
        });

        it('Caso 12: Buscar producto inexistente con ID 999 - inválida', async () => {
            
            Product.findByPk.mockResolvedValue(null);
            
            const resultado = await ProductService.getProductById(999);
           
            //Verificamos que se buscó el producto correcto
            expect(Product.findByPk).toHaveBeenCalledWith(999);
            //Verificamos que no se devolvió ningún producto
            expect(resultado).toBeNull();
        });
    });

    describe('createProduct', () => {
        it('Caso 13: Crear producto con categoría existente - válida', async () => {
            
            const mockCategory = { id: 1, name: 'Tecnología' };
            const nuevoProducto = {
                name: 'Mouse',
                price: 25,
                inventory: 10,
                categoryId: 1
            };
           
            Category.findByPk.mockResolvedValue(mockCategory);
            Product.create.mockResolvedValue({ id: 2, ...nuevoProducto });
           
            const resultado = await ProductService.createProduct(nuevoProducto);
           
            //Verificamos que se buscó la categoría
            expect(Category.findByPk).toHaveBeenCalledWith(1);
            //Verificamos que se creó el producto con los datos recibidos
            expect(Product.create).toHaveBeenCalledWith(nuevoProducto);
            //Verificamos el producto devuelto
            expect(resultado).toEqual({ id: 2, ...nuevoProducto });
        });

        it('Caso 14: Rechazar producto con categoría inexistente 999 - inválida', async () => {
         
            Category.findByPk.mockResolvedValue(null);
            const productoInvalido = {
                name: 'Teclado',
                price: 40,
                inventory: 5,
                categoryId: 999
            };
           
            const resultado = ProductService.createProduct(productoInvalido);
            
            //Verificamos que se muestra el error esperado
            await expect(resultado).rejects.toThrow('Category with id 999 does not exist');
            //Verificamos que no se creó el producto
            expect(Product.create).not.toHaveBeenCalled();
        });
    });

    describe('getProductsByCategories', () => {
        it('Caso 15: Rechazar consulta sin categorías - inválida', async () => {
          
            const resultado = ProductService.getProductsByCategories('');
           
            //Verificamos que se muestra el error esperado
            await expect(resultado).rejects.toThrow('Categories parameter is required');
            //Verificamos que no se consultaron productos
            expect(Product.findAll).not.toHaveBeenCalled();
        });

        it('Caso 16: Consultar categorías 1 y 2 con orden y paginación - válida', async () => {
           
            const productos = [
                { id: 1, name: 'Laptop', categoryId: 1 },
                { id: 2, name: 'Escritorio', categoryId: 2 }
            ];
            Product.findAll.mockResolvedValue(productos);
            //Consultamos categorías 1 y 2 con filtros
            const resultado = await ProductService.getProductsByCategories(
                '1,2',
                { sort: 'price,DESC', limit: '5', offset: '0' }
            );
           
            //Verificamos las categorías, el orden y la paginación
            expect(Product.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        categoryId: {
                            [Op.in]: [1, 2]
                        }
                    },
                    include: Category,
                    order: [['price', 'DESC']],
                    limit: 5,
                    offset: 0
                })
            );
            //Verificamos los productos encontrados
            expect(resultado).toEqual(productos);
        });
    });

    describe('updateProduct', () => {
        it('Caso 17: Rechazar actualización con categoría inexistente 999 - inválida', async () => {
             
            Category.findByPk.mockResolvedValue(null);
           
            const resultado = ProductService.updateProduct(1, { categoryId: 999 });
 
            //Verificamos que se muestra el error esperado
            await expect(resultado).rejects.toThrow('Category with id 999 does not exist');
            //Verificamos que no se actualizó el producto
            expect(Product.update).not.toHaveBeenCalled();
        });

        it('Caso 18: Actualizar solo el precio sin cambiar la categoría - válida', async () => {
            
            Product.update.mockResolvedValue([1]);
            //Actualizamos el precio del producto 1
            const resultado = await ProductService.updateProduct(1, { price: 600 });
            
            //Verificamos que no se buscó una categoría
            expect(Category.findByPk).not.toHaveBeenCalled();
            //Verificamos que se actualizó el precio
            expect(Product.update).toHaveBeenCalledWith(
                { price: 600 },
                { where: { id: 1 } }
            );
            //Verificamos que se actualizó un producto
            expect(resultado).toEqual([1]);
        });
    });

    describe('getProductsByCategory', () => {
        const productos = [
            { id: 1, name: 'Laptop', price: 500, categoryId: 1 },
            { id: 2, name: 'Mouse', price: 25, categoryId: 1 }
        ];

        it('Caso 19: Consultar categoría 1 con orden y paginación - válida', async () => {
          
            Product.findAll.mockResolvedValue(productos);
            //Consultamos productos con orden y paginación
            const resultado = await ProductService.getProductsByCategory(
                1,
                { sort: 'price,DESC', limit: '5', offset: '2' }
            );
            
            //Verificamos que se aplicaron los filtros
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                include: Category,
                order: [['price', 'DESC']],
                limit: 5,
                offset: 2
            });
            //Verificamos los productos encontrados
            expect(resultado).toEqual(productos);
        });

        it('Caso 20: Consultar categoría 1 sin parámetros opcionales - válida', async () => {
           
            Product.findAll.mockResolvedValue(productos);
            
            const resultado = await ProductService.getProductsByCategory(1);
          
            //Verificamos que no se agregó orden ni paginación
            expect(Product.findAll).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                include: Category
            });
            //Verificamos los productos encontrados
            expect(resultado).toEqual(productos);
        });
    });
});
