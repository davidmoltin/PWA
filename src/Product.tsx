import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import useOnclickOutside from 'react-cool-onclickoutside';
import { useResolve } from './hooks';
import { addToCart, loadProductBySlug } from './service';
import { SocialShare } from './SocialShare';
import {
  useTranslation,
  useCurrency,
  useCartData,
  useMultiCartData,
  useCustomerData,
} from "./app-state";
import { VariationsSelector } from './VariationsSelector';
import { SettingsCart } from './SettingsCart';
import { ReactComponent as CloseIcon } from './images/icons/ic_close.svg';
import { ReactComponent as SpinnerIcon } from './images/icons/ic_spinner.svg';
import { ReactComponent as CaretIcon } from './images/icons/ic_caret.svg';
import { APIErrorContext } from './APIErrorProvider';

import './Product.scss';

import imagePlaceHolder from './images/img_missing_horizontal@2x.png'


interface ProductParams {
  productSlug: string;
}

export const Product: React.FC = () => {
  const { productSlug } = useParams<ProductParams>();
  const { t } = useTranslation();
  const { selectedLanguage } = useTranslation();
  const { selectedCurrency } = useCurrency();
  const { updateCartItems, setCartQuantity, handleShowCartPopup } = useCartData();
  const { isLoggedIn, token } = useCustomerData();
  const { multiCartData, updateCartData, updateSelectedCart, setIsCartSelected } = useMultiCartData();

  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>();

  const modalRef = useOnclickOutside(() => {
    setModalOpen(false)
  });

  const dropdownRef = useOnclickOutside(() => {
    setDropdownOpen(false)
  });
  const { addError } = useContext(APIErrorContext);

  const [product] = useResolve(
    async () => {
      try {
        return productSlug !== '' && loadProductBySlug(productSlug, selectedLanguage, selectedCurrency, token)
      } catch (error) {
        addError(error.errors);
      }
    },
    [productSlug, selectedLanguage, selectedCurrency, addError, token]
  );
  const [productId, setProductId] = useState('');

  useEffect(() => {
    product && setProductId(product.id);
    product && setImageSrc(`https://ep-demo-assets.s3-us-west-2.amazonaws.com/BELLEVIE/skuImages/${product.attributes.sku}.png`);
  }, [product]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : 'unset';
  }, [modalOpen])

  // const productImageHrefs = useProductImages(product);
  // const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // const isPrevImageVisible = currentImageIndex > 0;
  // const isNextImageVisible = currentImageIndex < (productImageHrefs?.length ?? 0) - 1;
  // const productBackground = product?.background_color ?? '';

  // const handlePrevImageClicked = () => {
  //   setCurrentImageIndex(currentImageIndex - 1);
  // };

  const handleAddToCart = (cartId?: string) => {
    const currentCart = localStorage.getItem("mcart") || "";
    const mcart = cartId ? cartId : currentCart;
    setAddToCartLoading(true);
    return addToCart(mcart, productId, token, selectedLanguage, selectedCurrency)
      .then(() => {
        if (cartId && cartId !== currentCart) {
          localStorage.setItem('mcart', cartId);
        } else {
          updateCartItems();
        }
        if (isLoggedIn) {
          setIsCartSelected(true);
          updateCartData();
        }
        setCartQuantity(1);
        handleShowCartPopup();
      }).finally(() => {
        setAddToCartLoading(false);
      })
  };

  // const handleNextImageClicked = () => {
  //   setCurrentImageIndex(currentImageIndex + 1);
  // };

  const handleVariationChange = (childID: string) => {
    setProductId(childID);
  };

  const handleAddToSelectedCart = (cart:any) => {
    updateSelectedCart(cart);
    handleAddToCart(cart.id);
    setDropdownOpen(false);
  };

  const handleAddToDefaultCart = () => {
    if (multiCartData && multiCartData.length > 0) {
      handleAddToSelectedCart(multiCartData[0]);
    }
  };

  const handlePictureError = () => {
    setImageSrc(imagePlaceHolder);
  };

  const CartButton = () => {
    if (!productId) return null;
    if (isLoggedIn) {
      const hasPrice = product.attributes.price && product.attributes.price[selectedCurrency] && product.attributes.price[selectedCurrency].amount;
      return (
        <div className="product__addtocartdropdowncontainer">
          <div className="product__addtocartdropdownwrap">
            <button
              className="epbtn --primary product__addtocartbtn"
              onClick={handleAddToDefaultCart}
              disabled={!hasPrice}
            >
              {t("add-to-cart")}
              {' - '}
              {multiCartData && multiCartData.length > 0 && multiCartData[0].name}
            </button>
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className={`epbtn --primary product__addtocartdropdowntoggle${
              dropdownOpen ? " --open" : ""
            }`} disabled={!hasPrice}>
              {addToCartLoading ? (
                <SpinnerIcon className="product__addtocartdropdownicspinner" />
              ) : (
                <CaretIcon
                  className={`product__addtocartdropdowniscaret ${
                    dropdownOpen ? "--rotated" : ""
                  }`}
                />
              )}
            </button>
          </div>
          {dropdownOpen ? (
            <div className="product__addtocartdropdowncontent">
              {multiCartData.slice(1).map((cart: moltin.CartItem) => (
                <button
                  className="product__addtocartdropdownbtn"
                  key={cart.id}
                  onClick={() => { handleAddToSelectedCart(cart) }}
                >
                  {cart.name}
                </button>
              ))}
              <button
                className="product__addtocartdropdownbtn"
                key="create-cart-btn"
                onClick={() => setModalOpen(true)}
              >
                {t('create-new-cart')}
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <button className="epbtn --secondary" onClick={() => handleAddToCart()} disabled={!(product.attributes.price && product.attributes.price[selectedCurrency])}>
        {t("add-to-cart")}
      </button>
    );
  };

  const CreateCartHeader = (
    <div className="product__createcartheader">
      <span className="product__createcartheadertext">{t("create-cart")}</span>
      <button
        className="product__createcartheaderbnt"
        onClick={() => setModalOpen(false)}
      >
        <CloseIcon />
      </button>
    </div>
  );

  return (
    <div className="product">
      {product ? (
        <div className="product__maincontainer">
          <div className="product__imgcontainer">
            <img className="product__img" src={imageSrc} alt={product.attributes.name} onError={() => handlePictureError()} />
            {/* {productImageHrefs.length > 0 && (
              <>
                <img className="product__img" src={productImageHrefs?.[currentImageIndex]} alt={product.name} style={{ backgroundColor: productBackground }} />
                {isPrevImageVisible && (
                  <button className="product__previmagebtn" aria-label={t('previous-image')} onClick={handlePrevImageClicked}>
                    <svg fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                )}
                {isNextImageVisible && (
                  <button className="product__nextimagebtn" aria-label={t('next-image')} onClick={handleNextImageClicked}>
                    <svg fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7"></path></svg>
                  </button>
                )}
              </>
            )} */}
          </div>
          <div className="product__details">
            <h1 className="product__name">
              {product.attributes.name}
            </h1>
            <div className="product__sku">
              {product.attributes.sku}
            </div>
            <div className="product__price">
              {product.attributes.price && product.attributes.price[selectedCurrency] && new Intl.NumberFormat(selectedLanguage, { style: 'currency', currency: selectedCurrency }).format((product.attributes.price[selectedCurrency].amount || 0)/100)}
            </div>
            {/* <Availability available={isProductAvailable(product)} />
            <div className="product__comparecheck">
              <CompareCheck product={product} />
            </div> */}
            {
              product.meta.variations
                ? <VariationsSelector product={product} onChange={handleVariationChange} />
                : ''
            }
            <div className="product__moltinbtncontainer">
              <div ref={dropdownRef}>
                <CartButton/>
              </div>
            </div>
            <div className="product__description">
              {product.attributes.description}
            </div>
            <div className="product__socialshare">
              <SocialShare name={product.attributes.name} description={product.attributes.description || ''} imageHref="" />
            </div>
          </div>
        </div>
      ) : (
        <div className="loader" />
      )}
      {modalOpen ? (
        <div className="product__createcartmodalbg">
          <div className="product__createcartmodal" ref={modalRef}>
            <SettingsCart
              title={CreateCartHeader}
              onCartCreate={() => {setModalOpen(false)}}
              handleHideSettings={() => {setModalOpen(false)}}
              setShowCartAlert={() => ''}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
