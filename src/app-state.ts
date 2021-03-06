import { useState, useEffect, useCallback } from 'react';
import constate from 'constate';
import * as moltin from '@moltin/sdk';
import {
  getCustomer,
  getAddresses,
  getAllOrders,
  getCartItems,
  loadEnabledCurrencies,
  getMultiCarts,
  createNewCart,
  editCartInfo,
  addCustomerAssociation,
  loadCustomerAuthenticationSettings,
  loadOidcProfiles,
  loadAllNodes,
} from './service';

import { config } from './config';

const languages = config.supportedLocales.map(el => {
  return {
    [el.key] : require(`./locales/${el.key}.json`),
  }
}).reduce((result, current) => {
  return Object.assign(result, current);
}, {});

const defaultLanguage = config.defaultLanguage;
const translations: { [lang: string]: { [name: string]: string } } = {
  ...languages,
};

function getInitialLanguage(): string {
  const savedLanguage = localStorage.getItem('selectedLanguage');

  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }

  if (navigator.language) {
    if (translations[navigator.language]) {
      return navigator.language;
    }

    const langPart = navigator.language.split('-')[0];
    if (translations[langPart]) {
      return langPart;
    }
  }

  if (navigator.languages) {
    for (const lang of navigator.languages) {
      if (translations[lang]) {
        return lang;
      }

      const langPart = lang.split('-')[0];
      if (translations[langPart]) {
        return langPart;
      }
    }
  }

  return defaultLanguage;
}
function checkTranslations() {
  const keys: { [key: string]: boolean } = {};

  for (const lang in translations) {
    for (const name in translations[lang]) {
      keys[name] = true;
    }
  }

  for (const lang in translations) {
    for (const key in keys) {
      if (!translations[lang][key]) {
        console.warn(`Language '${lang}' does not have translation for key: '${key}'`);
      }
    }
  }
}

if (process.env.NODE_ENV !== 'production') {
  checkTranslations();
}

function useTranslationState() {
  const [selectedLanguage, setSelectedLanguage] = useState(getInitialLanguage());

  const t = (name: string, values?: { [key: string]: string }) => {
    const template = translations[selectedLanguage][name];

    if (!template) {
      return '';
    }

    const v = values ?? {};
    const r = Object.keys(v).reduce((acc, k) => acc.replace(`{${k}}`, v[k]), template);

    return r;
  };

  const setLanguage = (newLang: string) => {
    if (!translations[newLang]) {
      return;
    }

    localStorage.setItem('selectedLanguage', newLang);
    setSelectedLanguage(newLang);
  };

  return {
    t,
    selectedLanguage,
    setLanguage,
  };
}

function useCustomerDataState() {
  const token = localStorage.getItem('mtoken') || '';
  const id = localStorage.getItem('mcustomer') || '';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerToken, setCustomerToken] = useState(token);
  const [customerId, setCustomerId] = useState(id);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (customerToken) {
      getCustomer(customerId, customerToken).then(customer => {
        if (customer.email) {
          setCustomerEmail(customer.email);
          setCustomerName(customer.name);
        }
        setIsLoggedIn(true);
      }).catch(err => {
        if (err.errors.find((error: any) => error.status === 403)) {
          clearCustomerData();
        }
      });
    } else {
      clearCustomerData();
    }
  }, [customerId, customerToken]);

  const setCustomerData = useCallback((token: string, id: string) => {
    localStorage.setItem('mtoken', token);
    localStorage.setItem('mcustomer', id);
    setCustomerToken(token);
    setCustomerId(id);
  }, []);

  const clearCustomerData = () => {
    localStorage.setItem('mtoken', '');
    localStorage.setItem('mcustomer', '');
    setCustomerToken('');
    setCustomerId('');
    setIsLoggedIn(false);
  };

  const setEmail = (email:string) => {
    setCustomerEmail(email);
  };

  const setName = (name:string) => {
    setCustomerName(name);
  };

  return {
    token,
    id,
    isLoggedIn,
    customerEmail,
    customerName,
    setEmail,
    setName,
    setCustomerData,
    clearCustomerData
  }
}

function useAddressDataState() {
  const token = localStorage.getItem('mtoken') || '';
  const id = localStorage.getItem('mcustomer') || '';

  const [addressData, setAddressData] = useState<moltin.Address[]>([]);

  useEffect(() => {
    if (token) {
      getAddresses(id, token).then(res => {
        setData(res.data);
      });
    }
    else {
      clearCustomerData();
    }
  }, [id, token]);

  const updateAddresses = () => {
    getAddresses(id, token).then(res => {
      setData(res.data);
    });
  };

  const setData = (data: any) => {
    setAddressData(data);
  };
  const clearCustomerData = () => {
    setAddressData([]);
  };

  return { addressData, updateAddresses }

}

function usePurchaseHistoryState() {
  const token = localStorage.getItem('mtoken') || '';
  const id = localStorage.getItem('mcustomer') || '';

  const [ordersData, setOrdersData] = useState<moltin.Order[]>([]);
  const [ordersItemsData, setOrdersItemsData] = useState<moltin.OrderItem[]>([]);

  useEffect(() => {
    if (token) {
      getAllOrders(token).then((res: any) => {
        setData(res.data);
        if (res && res.included)
         setItemsData(res.included.items);
      });
    }
    else {
      clearCustomerData();
    }
  }, [id, token]);

  const updatePurchaseHistory = () => {
    getAllOrders(token).then(res => {
      setData(res.data);
    });
  };

  const setData = (data: any) => {
    setOrdersData(data);
  };

  const setItemsData = (data: any) => {
    setOrdersItemsData(data);
  };

  const clearCustomerData = () => {
    setOrdersData([]);
    setOrdersItemsData([]);
  };

  return { ordersData, ordersItemsData, updatePurchaseHistory }
}

const defaultCurrency = config.defaultCurrency;

function useCurrencyState() {
  const [allCurrencies, setAllCurrencies] = useState<moltin.Currency[]>([]);
  // Set previously saved or default currency before fetching the list of supported ones
  const [selectedCurrency, setSelectedCurrency] = useState(localStorage.getItem('selectedCurrency') ?? defaultCurrency);

  const setCurrency = (newCurrency: string) => {
    localStorage.setItem('selectedCurrency', newCurrency);
    setSelectedCurrency(newCurrency);
  };

  useEffect(() => {
    // Only fetch currencies once
    if (allCurrencies.length > 0) {
      return;
    }

    loadEnabledCurrencies().then(currencies => {
      // Check if we need to update selectedCurrency
      const selected = currencies.find(c => c.code === selectedCurrency);

      if (!selected) {
        // Saved or default currency we initially selected was not found in the list of server currencies
        // Switch selectedCurrency to server default one if exist or first one in the list
        setSelectedCurrency(currencies.find(c => c.default)?.code ?? currencies[0].code);

        // Clear selection in local storage
        localStorage.removeItem('selectedCurrency');
      }

      setAllCurrencies(currencies);
    }).catch((err) => {
      console.error(err)
    });
  }, [allCurrencies.length, selectedCurrency]);

  return {
    allCurrencies,
    selectedCurrency,
    setCurrency,
  }
}

function getCategoryPaths(categories: moltin.Node[]): { [categoryId: string]: moltin.Node[] } {
  const lastCat = categories[categories.length - 1];

  let map: { [categoryId: string]: moltin.Node[] } = {
    [lastCat.id]: [...categories]
  };

  const childCats = lastCat.relationships?.children?.data ?? [];

  for (const child of childCats) {
    map = { ...map, ...getCategoryPaths([...categories, child]) };
  }

  return map;
}

function mergeMaps(tree: moltin.Node[]): { [categoryId: string]: moltin.Node[] } {
  return tree.reduce((acc, c) => ({ ...acc, ...getCategoryPaths([c]) }), {});
}

function getChildNodes(parentId: string, nodes: any[]) {
  let childNodes = nodes.filter(node => node.relationships.parent && (node.relationships.parent.data.id === parentId)).map((childNode: any) => {
    childNode.relationships.children.data = getChildNodes(childNode.id, nodes);
    return childNode;
  });

  return childNodes;
}

function useCategoriesNodeState(customerToken: string) {
  const [categoryPaths, setCategoryPaths] = useState<any>();
  const [categoriesTree, setCategoriesTree] = useState<any>();
  useEffect(() => {
    setCategoryPaths(undefined);
    setCategoriesTree(undefined);
    loadAllNodes(customerToken).then(result => {
      const hierarchy = result.find((node: any) => !node.relationships.parent);
      const tree = getChildNodes(hierarchy.id, result);
      setCategoriesTree(tree);
      setCategoryPaths(mergeMaps(tree));
    });
  }, [customerToken]);
  const categoryPathById = (id: string) => {
    return categoryPaths?.[id];
  };
  return {
    categoriesTree,
    categoryPathById,
  };
}

function useCompareProductsState() {
  const [compareProducts, setCompareProducts] = useState<moltin.Product[]>([]);
  const [showCompareMenu, setShowCompareMenu] = useState(false);

  const isComparing = (productId: string) => compareProducts.filter(p => p.id === productId).length > 0;
  const isCompareEnabled = (productId: string) => isComparing(productId) || compareProducts.length < config.maxCompareProducts;

  const addToCompare = (product: moltin.Product) => {
    if (!compareProducts.find(p => p.id === product.id)) {
      setCompareProducts([...compareProducts, product]);
      if (!showCompareMenu) {
        setShowCompareMenu(true);
        setTimeout(() => {
          setShowCompareMenu(false);
        }, 3200);
      }
    }
  };

  const removeFromCompare = (productId: string) => {
    setCompareProducts(compareProducts.filter(p => p.id !== productId));
  };

  const removeAll = () => {
    setCompareProducts([]);
  };

  return {
    compareProducts,
    showCompareMenu,
    isComparing,
    isCompareEnabled,
    addToCompare,
    removeFromCompare,
    removeAll,
  };
}

function useCustomerAuthenticationSettingsState() {
  const [authenticationSettings, setAuthenticationSettings] = useState<any>()
  const [isLoadingOidcProfiles, setIsLoadingOidcProfiles] = useState(true);
  const [oidcProfiles, setOidcProfiles] = useState<moltin.ResourcePage<moltin.Profile>>();

  useEffect(()=>{
    loadCustomerAuthenticationSettings().then((authSettings) => {
      setAuthenticationSettings(authSettings);

      const authenticationRealmId = authSettings?.data?.relationships['authentication-realm']?.data?.id;

      loadOidcProfiles(authenticationRealmId).then((profiles) => {
        setOidcProfiles(profiles);
        setIsLoadingOidcProfiles(false);
      })
    }).catch((err)=>{
      console.log(err)
    });
  }, [])

  return { authenticationSettings, isLoadingOidcProfiles, oidcProfiles };
}

function useCartItemsState() {
  const [cartData, setCartData] = useState<moltin.CartItem[]>([]);
  const [promotionItems, setPromotionItems] = useState<moltin.CartItem[]>([]);
  const [count, setCount] = useState(0);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [totalPrice, setTotalPrice] = useState('');
  const mcart = localStorage.getItem('mcart') || '';

  useEffect(() => {
    if (mcart) {
      getCartItems(mcart).then(res => {
        setCartData(res.data.filter(({ type }) => type === 'cart_item' || type === 'custom_item'));
        setPromotionItems(res.data.filter(({ type }) => type === 'promotion_item'));
        setCount(res.data.reduce((sum, { quantity }) => sum + quantity, 0));
        setTotalPrice(res.meta.display_price.without_tax.formatted);
      });
    }
  }, [mcart]);

  const updateCartItems = () => {
    const mcart = localStorage.getItem('mcart') || '';
    getCartItems(mcart).then(res => {
      const cartData = res.data.length ? res.data.filter(({ type }) => type === 'cart_item' || type === 'custom_item') : [];
      setCartData(cartData);
      const promotionItems = res.data.length ? res.data.filter(({ type }) => type === 'promotion_item') : [];
      setPromotionItems(promotionItems);
      const itemQuantity = res.data.length ? res.data.reduce((sum, { quantity }) => sum + quantity, 0) : 0;
      setCount(itemQuantity);
      const totalPrice = res.meta ? res.meta.display_price.without_tax.formatted : '';
      setTotalPrice(totalPrice);
    });
  };

  const handleShowCartPopup = () => {
    if (!showCartPopup) {
      setShowCartPopup(true);
      setTimeout(() => {
        setShowCartPopup(false);
      }, 3200);
    }
  };

  return { cartData, promotionItems, count, cartQuantity, setCartQuantity, showCartPopup, handleShowCartPopup, totalPrice, updateCartItems }
}

function useMultiCartDataState() {
  const token = localStorage.getItem('mtoken') || '';
  const mcustomer = localStorage.getItem('mcustomer') || '';
  const [multiCartData, setMultiCartData] = useState<moltin.CartItem[]>([]);
  const [selectedCart, setSelectedCart] = useState<moltin.CartItem>();
  const [isCreateNewCart, setIsCreateNewCart] = useState(false);
  const [isCartSelected, setIsCartSelected] = useState(false);
  const [guestCartId, setGuestCartId] = useState('');

  useEffect(() => {
    if (token) {
      getMultiCarts(token).then(res => {
        setMultiCartData(res.data);
        const cartId = res.data[0] ? res.data[0].id : '';
        updateSelectedCart(res.data[0]);
        localStorage.setItem('mcart', cartId);
      });
    }
    else {
      clearCartData();
    }
  }, [mcustomer, token]);

  const createCart = (data: any) => (
    createNewCart(data, token).then((cartRes: any) => {
        const customerId = localStorage.getItem('mcustomer') || '';
        const token = localStorage.getItem('mtoken') || '';
        addCustomerAssociation(cartRes.data.id, customerId, token).then(() =>
          getMultiCarts(token).then(res => {
            setMultiCartData(res.data);
          })
        )
      }
    )
  );

  const createDefaultCart = () => {
    const customerId = localStorage.getItem('mcustomer') || '';
    const token = localStorage.getItem('mtoken') || '';
    getMultiCarts(token).then(res => {
      if (res.data.length === 0) {
        createNewCart({name: 'Cart'}, token).then((cartRes: any) =>
          addCustomerAssociation(cartRes.data.id, customerId, token).then(() =>
            getMultiCarts(token).then(res => {
              setMultiCartData(res.data);
              const selectedCartData = res.data.filter(el => el.id === cartRes.data.id);
              setSelectedCart(selectedCartData[0]);
            })
          )
        )
      }
    });
  }

  const editCart = (data: any) => (
    editCartInfo(data, token).then((updatedCart: any) =>
      getMultiCarts(token).then(res => {
        setMultiCartData(res.data);
        const selectedCartData = res.data.filter(el => el.id === updatedCart.data.id);
        setSelectedCart(selectedCartData[0]);
      })
    )
  );

  const updateSelectedCart = (cart: any) => {
    setSelectedCart(cart);
  };

  const clearCartData = () => {
    setMultiCartData([]);
  };

  const updateCartData = () => {
    const selectedCart = localStorage.getItem('mcart');
    getMultiCarts(token).then(res => {
      setMultiCartData(res.data);
      const selectedCartData = res.data.filter(el => (el.id === selectedCart));
      if (selectedCartData.length === 0) {
        const cartId = res.data[0] ? res.data[0].id : '';
        updateSelectedCart(res.data[0]);
        localStorage.setItem('mcart', cartId);
      }
    });
  };

  return {
    multiCartData,
    setMultiCartData,
    createCart,
    selectedCart,
    updateSelectedCart,
    isCartSelected,
    setIsCartSelected,
    editCart,
    updateCartData,
    setIsCreateNewCart,
    isCreateNewCart,
    guestCartId,
    setGuestCartId,
    createDefaultCart
  }
}

function useGlobalState() {
  const translation = useTranslationState();
  const currency = useCurrencyState();
  const addressData = useAddressDataState();
  const ordersData = usePurchaseHistoryState();
  const cartData = useCartItemsState();
  const multiCartData = useMultiCartDataState();
  const customerData = useCustomerDataState();

  return {
    translation,
    customerData,
    addressData,
    ordersData,
    cartData,
    multiCartData,
    currency,
    categories: useCategoriesNodeState(customerData.token),
    compareProducts: useCompareProductsState(),
    authenticationSettings: useCustomerAuthenticationSettingsState(),
  };
}

export const [
  AppStateProvider,
  useTranslation,
  useCustomerData,
  useAddressData,
  useOrdersData,
  useCurrency,
  useCategories,
  useCompareProducts,
  useCustomerAuthenticationSettings,
  useCartData,
  useMultiCartData,
] = constate(
  useGlobalState,
  value => value.translation,
  value => value.customerData,
  value => value.addressData,
  value => value.ordersData,
  value => value.currency,
  value => value.categories,
  value => value.compareProducts,
  value => value.authenticationSettings,
  value => value.cartData,
  value => value.multiCartData,
);
