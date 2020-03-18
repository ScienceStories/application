import api from "../../apiClient";

import * as actionTypes from "./types";


const setUserState = (response, dispatch, next) => {
  const {token, user} = response.data;
  localStorage.setItem("token", token);
  localStorage.setItem("userId", user.id);
  localStorage.setItem("userEmail", user.email);
  localStorage.setItem("isAdmin", user.isAdmin);
  dispatch(next(token, user.id, user.email, user.isAdmin));
}
// ======================================== SIGNUP ======================================== //

export const signUpStart = () => {
  return {
    type: actionTypes.SIGNUP_START
  };
};

export const signUpSuccess = (token, userId, email, isAdmin) => {
  return {
    type: actionTypes.SIGNUP_SUCCESS,
    token: token,
    userId: userId,
    email: email,
    isAdmin: isAdmin
  };
};

export const signUpFail = error => {
  return {
    type: actionTypes.SIGNUP_FAIL,
    error: error
  };
};

export const signUp = (email, password) => {
  return dispatch => {
    dispatch(signUpStart());
    return api.post('/api/user/register', {email: email, password: password})
      .then(response => setUserState(response, dispatch, signUpSuccess))
      .catch(err => {
        console.log("error", err);
        dispatch(
          signUpFail(api.parseError(err))
        );
      });
  };
};

// ======================================== SIGNIN ======================================== //
export const signInStart = () => {
  return {
    type: actionTypes.SIGNIN_START
  };
};

export const signInSuccess = (token, userId, email, isAdmin) => {
  return {
    type: actionTypes.SIGNIN_SUCCESS,
    token: token,
    userId: userId,
    email: email,
    isAdmin: isAdmin
  };
};

export const signInFail = error => {
  return {
    type: actionTypes.SIGNIN_FAIL,
    error: error
  };
};

export const signIn = (email, password) => {
  return dispatch => {
    dispatch(signInStart());
    api.post('/api/user/login', {email: email, password: password})
      .then(response => setUserState(response, dispatch, signInSuccess))
      .catch(err => {
        dispatch(signInFail(api.parseError(err)));
      });
  };
};

// ======================================== SIGNOUT ======================================== //

export const signOutStart = () => {
  return {
    type: actionTypes.SIGNOUT
  };
};

export const signOutSuccess = () => {
  return {
    type: actionTypes.SIGNOUT_SUCCESS,
    msg: "Signed Out"
  };
};

export const signOut = () => {
  return dispatch => {
    dispatch(signOutStart());
    api.post('/api/user/logout')
      .then(response => {
        localStorage.clear();
        dispatch(emptyCart());
        dispatch(signOutSuccess());
      })
      .catch(err => console.log(err));
  };
};

export const getProducts = (discounts, cartProducts, callback) => dispatch => {
    return api.get('/api/product?discounts='+JSON.stringify(discounts))
      .then(response => {
        const products = response.data;
        if (!!callback) {
          callback();
        }
        if (!!cartProducts) {
          const productMap = {};
          products.forEach((p, index) => {
            p.index = index;
            productMap[p.id] = p;

            dispatch(updateRemaingProducts(cartProducts, p));
          });
          cartProducts.forEach((cp, index) => {
            cartProducts[index] = {...cp, ...productMap[cp.id]}
          })
          return dispatch(updateCart(cartProducts));
        }
        return dispatch({
          type: actionTypes.GET_PRODUCTS,
          products: products
        });
      })
      .catch(err => console.log(err));
}

export const createProduct = (product, products, callback) => dispatch => {
    return api.post('/api/product', product)
      .then(response => {
        const product = response.data;
        products.push(product);

        dispatch({
          type: actionTypes.CREATE_PRODUCT,
          products: products
        });
        dispatch({
          type: actionTypes.GET_PRODUCTS,
          products: products
        });
        return callback(product, products);
      })
      .catch(err => console.log(err));
}

export const updateProduct = (product, products, callback) => dispatch => {
    return api.put('/api/product/'+product.id, product)
      .then(response => {
        const newProduct = response.data;
        const index = products.findIndex(p => p.id === newProduct.id);
        products[index] = newProduct;
        dispatch({
          type: actionTypes.UPDATE_PRODUCT,
          products: products
        });
        dispatch({
          type: actionTypes.GET_PRODUCTS,
          products: products
        });
        return callback(newProduct, products);
      })
      .catch(err => console.log(err));
}

export const deleteProduct = (product, products, callback) => dispatch => {
    return api.delete('/api/product/'+product.id, product)
      .then(response => {
        const newProduct = response.data;
        const index = products.findIndex(p => p.id === newProduct.id);
        products[index] = newProduct;
        dispatch({
          type: actionTypes.UPDATE_PRODUCT,
          products: products
        });
        dispatch({
          type: actionTypes.GET_PRODUCTS,
          products: products
        });
        return callback(newProduct, products);
      })
      .catch(err => console.log(err));
}


export const updateRemaingProducts = (cartProducts, product) => dispatch => {

  const index = cartProducts.findIndex(cp => cp.id === product.id);
  if (index >= 0) {
    const cartProduct = cartProducts[index];
    product.remainingQuantity = product.totalQuantity - cartProduct.quantity;
  } else {
    product.remainingQuantity = product.totalQuantity;
  }
  return dispatch({
    type: actionTypes.UPDATE_REMAINING_PRODUCTS,
    product: product
  });
}
// Cart management
export const loadCart = (cartProducts, products) => dispatch => {
  products.forEach(p => {
    const index = cartProducts.findIndex(cp => cp.id === p.id);
    if (index >= 0) {
      const cartProduct = cartProducts[index];
      p.remainingQuantity = p.totalQuantity - cartProduct.quantity;
    } else {
      p.remainingQuantity = p.totalQuantity;
    }
  })
  return {
    type: actionTypes.LOAD_CART,
    cartProducts: cartProducts,
    products: products,
  }
};

export const subtractFromCart = (product, cartProducts) => dispatch => {
  cartProducts.forEach(cp => {
    if (cp.id === product.id) {
      cp.quantity -= 1;
      cp.subtotal = cp.quantity * product.price;
      cp.discountedSubtotal = cp.quantity * product.discountedPrice;
      cp.remainingQuantity = product.totalQuantity - cp.quantity;
      product.remainingQuantity = cp.remainingQuantity;
    }
  });
  dispatch(updateCart(cartProducts));
  dispatch(updateRemaingProducts(cartProducts, product))
  return dispatch({
    type: actionTypes.SUBTRACT_PRODUCT,
    cartProducts: cartProducts
  })
};

export const addToCart = (product, cartProducts) => dispatch => {
  if (product.remainingQuantity < 1) return false;
  let productAlreadyInCart = false;
  cartProducts.forEach(cp => {
    if (cp.id === product.id) {
      cp.quantity += 1;
      cp.subtotal = cp.quantity * product.price;
      cp.discountedSubtotal = cp.quantity * product.discountedPrice;
      cp.remainingQuantity = product.totalQuantity - cp.quantity;
      product.remainingQuantity = cp.remainingQuantity;
      productAlreadyInCart = true;
    }
  });

  if (!productAlreadyInCart) {
    product.quantity = 1;
    product.remainingQuantity = product.totalQuantity - 1;
    cartProducts.push(product);
  }
  dispatch(updateCart(cartProducts));
  dispatch(updateRemaingProducts(cartProducts, product))
  return dispatch({
    type: actionTypes.ADD_PRODUCT,
    cartProducts: cartProducts
  })
};

export const removeFromCart = (product, cartProducts) => dispatch => {
  const index = cartProducts.findIndex(p => p.id === product.id);
  product.quantity = 0;
  if (index >= 0) {
    cartProducts.splice(index, 1);
    dispatch(updateCart(cartProducts));
    dispatch(updateRemaingProducts(cartProducts, product))
  }
  return {
    type: actionTypes.REMOVE_PRODUCT,
    cartProducts: cartProducts
  }
};

export const updateCart = (cartProducts) => dispatch => {
  let cartQuantity = cartProducts.reduce((sum, p) => {
    if (!p.quantity) dispatch(removeFromCart(p, cartProducts));
    sum += p.quantity;
    return sum;
  }, 0);

  let { cartTotal, discountedCartTotal } = cartProducts.reduce((totals, p) => {
    totals.cartTotal += p.quantity * p.price;
    totals.discountedCartTotal += p.quantity * p.discountedPrice;
    return totals;
  }, {cartTotal: 0, discountedCartTotal: 0});
  return dispatch({
    type: actionTypes.UPDATE_CART,
    cartTotal: cartTotal,
    discountedCartTotal: discountedCartTotal,
    cartQuantity: cartQuantity,
  });
};

export const openCart = () => {
  return {
    type: actionTypes.OPEN_CART,
    cartIsOpen: true,
  };
};

export const closeCart = () => {
  return {
    type: actionTypes.OPEN_CART,
    cartIsOpen: false,
  };
};

// Admin Dashboard
export const getUsers = (callback) => dispatch => {
  return api.get('/api/user/')
    .then(response => {
      if (!!callback) callback(response.data);
      return dispatch({
        type: actionTypes.GET_USERS
      });
    })
    .catch(err => console.log(err));
}

export const getOrders = (callback) => dispatch => {
  return api.get('/api/order/')
    .then(response => {
      if (!!callback) callback(response.data);
      return dispatch({
        type: actionTypes.GET_ORDERS
      });
    })
    .catch(err => console.log(err));
}

export const uploadProductImage = (file, callback) => dispatch => {
  const data = new FormData()
  data.append('file', file, file.name)
  return api.post('/api/product/image', data, { headers: {
            'Content-Type': 'multipart/form-data'
          } } )
    .then(response => {
      if (!!callback) callback(response.data.fileName);
      return dispatch({
        type: actionTypes.GET_ORDERS
      });
    })
    .catch(err => console.log(err));
}

export const getDiscounts = (callback) => {
    return api.get('/api/discount/')
      .then(response => callback(response.data))
      .catch(err => console.log(err));
}

export const createDiscount = (discount, callback) => {
    return api.post('/api/discount/', discount)
      .then(response => callback(response.data))
      .catch(err => console.log(err));
}

export const updateDiscount = (discount, callback) => {
    return api.put('/api/discount/' + discount.id, discount)
      .then(response => callback(response.data))
      .catch(err => console.log(err));
}

export const applyDiscount = (code, discounts, cartProducts, callback) =>
  dispatch => {
    return api.get('/api/discount/' + code)
      .then(response => {
        const { id } = response.data;
        if (!id) {
          return callback(false, "Code Not Found");
        }
        if (discounts.indexOf(id) >= 0) {
          return callback(false, "Code Already Applied");
        }

        discounts.push(id);
        dispatch(getProducts(discounts, cartProducts));
        if (!!callback) {
          callback(true, "Code Applied! Happy shopping!");
        }

        return dispatch({
          type: actionTypes.APPLY_DISCOUNT,
          discounts: discounts
        });
      })
      .catch(err => {
        console.log(err);
        alert(err);
        callback(false);
      });
}

export const emptyCart = () => dispatch => {
  dispatch(updateCart([]))
  return dispatch({
    type: actionTypes.EMPTY_CART
  });
}

export const getStripePublicKey = (callback) => dispatch => {
  return api.get("/api/stripe/public-key")
    .then(response => callback(response.data))
}

export const purchaseOrder = (orderCtx) => dispatch => {
  return api.post("/api/order", orderCtx)
    .then(response => {
      const order = response.data;
      console.log(order);
      dispatch(emptyCart());
      setTimeout(function () {
        return window.location.href = order.reciept;
      }, 10);
    })
    .catch(error => {
      console.log("Payment Error: ", error);
      alert("Payment Error");
    });
}
